import Member from '../../models/Member.js'
import ResetPassword from '../../models/ResetPassword.js'
import httpResponses from './index.js'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import * as emails from '../../utils/emails.js'
import { validateEmail } from '../../validators/common.js'
import { recoveryAccepted, normalizedEmail, privateKey } from '../../utils/authLimits.js'
import { afterResponse, sendSecurityMail } from '../../utils/securityMail.js'
import { credentialDigest } from './session.js'
import mongoose from 'mongoose'

async function forgotPassword(request, response) {
  const { email } = request.body

  if (!email) {
    return response.status(400).json(httpResponses.onEmailEmpty)
  }
  if (Object.keys(validateEmail(request.body)).length > 0) {
    return response.status(400).json(httpResponses.onValidationError)
  }

  afterResponse(response, async () => {
    const user = await Member.findOne({ email: normalizedEmail(email) })
    if (!user) return
    const verificationNonce = crypto.randomBytes(32).toString('hex')
    const tokenFor = (nonce) => privateKey('password-recovery', `${user.id}:${nonce}`)
    const hash = await bcrypt.hash(tokenFor(verificationNonce), 5)
    // Preserve the existing link even when different workers cross a limit window.
    const record = await mongoose.connection.transaction(async (session) => {
      const existing = await ResetPassword.findOne({
        userID: user.id,
        expire: { $gt: new Date() },
        credentialDigest: credentialDigest(user.password),
      }).session(session)
      if (existing) return existing
      await ResetPassword.findOneAndUpdate(
        { _id: user._id },
        {
          userID: user.id,
          resetPasswordToken: hash,
          expire: Date.now() + 3600000,
          credentialDigest: credentialDigest(user.password),
          verificationNonce,
        },
        { upsert: true, session }
      )
      // Legacy randomly keyed records must not shadow the newly issued token.
      await ResetPassword.deleteMany({ userID: user.id, _id: { $ne: user._id } }).session(session)
      return { verificationNonce }
    })
    if (!record.verificationNonce) return

    const forgotMail = emails.forgotMail(user._id, tokenFor(record.verificationNonce))
    await sendSecurityMail(user.email, forgotMail.subject, forgotMail.text)
  })
  return response.status(202).json(recoveryAccepted)
}

export default {
  forgotPassword: forgotPassword,
}
