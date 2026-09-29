import { createHash } from 'node:crypto'
import mongoose from 'mongoose'
import EmailChange from '../../models/EmailChange.js'
import Member from '../../models/Member.js'
import ResetPassword from '../../models/ResetPassword.js'
import LoginSession from '../../models/LoginSession.js'
import { credentialDigest, SESSION_COOKIE, sessionCookieOptions } from '../authentication/session.js'
import { ApiError } from '../../utils/errors.js'
import { failure, success } from '../../utils/responses.js'

export const emailTokenHash = (token: string) => createHash('sha256').update(token).digest('hex')

export async function confirmEmail(request, response) {
  const { token } = request.body
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    return response.status(410).json(failure('INVALID_TOKEN', 'Linkki vanhentunut.'))
  await mongoose.connection.transaction(async (session) => {
    const pending = await EmailChange.findOneAndDelete(
      {
        _id: request.user._id,
        tokenHash: emailTokenHash(token),
        expiresAt: { $gt: new Date() },
      },
      { session }
    )
    const member = await Member.findById(request.user._id).session(session)
    if (
      !pending ||
      !member ||
      pending.credentialDigest !== credentialDigest(member.password) ||
      member.password !== request.user.password
    )
      throw new ApiError(410, 'INVALID_TOKEN', 'Linkki vanhentunut.')
    member.email = pending.email
    await member.save({ session })
    await ResetPassword.deleteMany({ userID: member.id }).session(session)
    await LoginSession.deleteMany({ memberId: member._id }).session(session)
  })
  response.clearCookie(SESSION_COOKIE, sessionCookieOptions())
  return response.json(success('Sähköpostiosoite vaihdettu. Kirjaudu uudelleen uudella osoitteella.'))
}
