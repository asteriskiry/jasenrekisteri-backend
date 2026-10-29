import mongoose from 'mongoose'
import Member from '../../models/Member.js'

import utils from '../../utils/index.js'
import httpResponses from './index.js'
import * as mail from '../../../config/mail.js'
import * as emails from '../../utils/emails.js'
import { failure, success } from '../../utils/responses.js'
import { ApiError } from '../../utils/errors.js'
import { appendMemberAudit, memberAuditValues } from './audit.js'

// Remove member

async function remove(request, response) {
  if (!['admin', 'board'].includes(request.user.role.toLowerCase())) {
    return response.status(403).json(httpResponses.clientAdminFailed)
  }
  await utils.checkUserControl(request.user._id)
  const memberID = request.body.memberID
  if (typeof memberID !== 'string' || !mongoose.isObjectIdOrHexString(memberID)) {
    return response.status(400).json(failure('INVALID_MEMBER', 'Virheellinen jäsentunniste.'))
  }
  const recipient = await mongoose.connection.transaction(async (session) => {
    const member = await Member.findOneAndDelete({ _id: memberID }, { session })
    if (!member) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Jäsentä ei löytynyt.')
    await appendMemberAudit({
      actor: request.user,
      targetId: member._id,
      action: 'member.deleted',
      before: memberAuditValues(member),
      session,
    })
    return member.email
  })

  notifyMemberDeleted(recipient)
  return response.json(success('Jäsen poistettu.'))
}

export function notifyMemberDeleted(recipient: string) {
  const email = emails.memberDeletedMail()
  const mailOptions = { from: mail.mailSender, to: recipient, subject: email.subject, text: email.text }
  mail.sendMailWithLogging(mailOptions, 'member-deleted').catch(() => {})
  mail.logMessage(mailOptions)
}

export default {
  remove: remove,
}
