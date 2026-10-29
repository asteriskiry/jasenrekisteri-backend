import { createHash } from 'node:crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import config from '../../../config/config.js'
import Member from '../../models/Member.js'
import { ApiError } from '../../utils/errors.js'
import { success } from '../../utils/responses.js'
import { appendMemberAudit, memberAuditValues } from './audit.js'
import { notifyMemberDeleted } from './remove.js'

const audience = 'delete-expired-members'

function requireAdmin(request) {
  if (request.user.role !== 'Admin')
    throw new ApiError(403, 'FORBIDDEN', 'Vain ylläpitäjä voi poistaa vanhentuneet käyttäjät.')
}

function expiredFilter(actorId, cutoff: Date) {
  return { _id: { $ne: actorId }, membershipEnds: { $type: 'date' as const, $lte: cutoff } }
}

function selectionDigest(members) {
  return createHash('sha256')
    .update(JSON.stringify(members.map((member) => [member._id.toString(), member.membershipEnds.toISOString()])))
    .digest('hex')
}

export async function previewExpired(request, response) {
  requireAdmin(request)
  const cutoff = new Date()
  const members = await Member.find(expiredFilter(request.user._id, cutoff))
    .select('_id membershipEnds')
    .sort({ _id: 1 })
    .lean()
  const previewToken = jwt.sign({ cutoff: cutoff.toISOString(), digest: selectionDigest(members) }, config.secret, {
    algorithm: 'HS256',
    audience,
    subject: request.user._id.toString(),
    expiresIn: '10m',
  })
  response.set('Cache-Control', 'no-store')
  return response.json(success('Poistettavat käyttäjät.', { count: members.length, previewToken }))
}

export async function removeExpired(request, response) {
  requireAdmin(request)
  if (request.body?.confirmation !== 'DELETE') {
    throw new ApiError(400, 'CONFIRMATION_REQUIRED', 'Vahvista poisto kirjoittamalla DELETE.')
  }
  const sendEmail = request.body.sendEmail === undefined ? true : request.body.sendEmail
  if (typeof sendEmail !== 'boolean') {
    throw new ApiError(400, 'INVALID_EMAIL_OPTION', 'Sähköposti-ilmoituksen valinnan on oltava totuusarvo.')
  }
  let preview
  try {
    preview = jwt.verify(request.body.previewToken, config.secret, {
      algorithms: ['HS256'],
      audience,
      subject: request.user._id.toString(),
    })
    if (
      typeof preview.cutoff !== 'string' ||
      !Number.isFinite(Date.parse(preview.cutoff)) ||
      typeof preview.digest !== 'string'
    )
      throw new Error('Invalid preview')
  } catch {
    throw new ApiError(400, 'INVALID_PREVIEW', 'Vahvistus on vanhentunut tai virheellinen. Avaa poisto uudelleen.')
  }

  const removed = await mongoose.connection.transaction(async (session) => {
    const members = await Member.find(expiredFilter(request.user._id, new Date(preview.cutoff)))
      .sort({ _id: 1 })
      .session(session)
    // Bind confirmation to the exact selection, including membership dates, not merely its count.
    if (selectionDigest(members) !== preview.digest) {
      throw new ApiError(
        409,
        'EXPIRED_MEMBERS_CHANGED',
        'Poistettavien käyttäjien tiedot ovat muuttuneet. Avaa poisto uudelleen ja tarkista määrä.'
      )
    }
    for (const member of members) {
      await appendMemberAudit({
        actor: request.user,
        targetId: member._id,
        action: 'member.deleted',
        before: memberAuditValues(member),
        session,
      })
    }
    await Member.deleteMany({ _id: { $in: members.map((member) => member._id) } }, { session })
    return members.map((member) => ({ id: member._id.toString(), email: member.email }))
  })
  if (sendEmail) {
    for (const member of removed) notifyMemberDeleted(member.email)
  }
  return response.json(
    success(`${removed.length} käyttäjää poistettu.`, {
      deletedIds: removed.map((member) => member.id),
      count: removed.length,
    })
  )
}
