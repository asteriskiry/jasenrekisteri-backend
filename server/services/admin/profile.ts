import mongoose from 'mongoose'
import Member from '../../models/Member.js'
import utils from '../../utils/index.js'
import httpResponses from './index.js'
import * as mail from '../../../config/mail.js'
import formatters from '../../utils/formatters.js'
import { validatePassword, validatePersonFields } from '../../validators/common.js'
import { failure } from '../../utils/responses.js'
import * as emails from '../../utils/emails.js'

async function get(request, response) {
  response.set('Cache-Control', 'no-store')
  if (!['admin', 'board'].includes(request.user.role.toLowerCase())) {
    return response.status(403).json(httpResponses.clientAdminFailed)
  }
  const memberID = request.query.memberID
  if (typeof memberID !== 'string' || !mongoose.isObjectIdOrHexString(memberID)) {
    return response.status(400).json(failure('INVALID_MEMBER', 'Virheellinen jäsentunniste.'))
  }
  await utils.checkUserControl(request.user._id)
  const member = await Member.findById(memberID).select('-password').lean().exec()
  if (!member) return response.status(404).json(failure('MEMBER_NOT_FOUND', 'Jäsentä ei löytynyt.'))
  return response.json(member)
}

async function update(request, response) {
  if (request.user.role.toLowerCase() !== 'admin') {
    return response.status(403).json(httpResponses.clientAdminFailed)
  }
  await utils.checkAdminControl(request.user._id)
  const memberID = request.body.memberID
  if (typeof memberID !== 'string' || !mongoose.isObjectIdOrHexString(memberID)) {
    return response.status(400).json(failure('INVALID_MEMBER', 'Virheellinen jäsentunniste.'))
  }
  const errors = {
    ...validatePersonFields(request.body, true),
    ...validatePassword(request.body),
  }
  if (Object.keys(errors).length > 0) {
    return response.status(400).json({
      ...httpResponses.onValidationError,
      error: { ...httpResponses.onValidationError.error, details: errors },
    })
  }
  const adminProfile = {
    firstName: formatters.capitalizeFirstLetter(request.body.firstName),
    lastName: formatters.capitalizeFirstLetter(request.body.lastName),
    utuAccount: request.body.utuAccount ? request.body.utuAccount.toLowerCase() : '',
    email: request.body.email.toLowerCase(),
    hometown: formatters.capitalizeFirstLetter(request.body.hometown),
    tyyMember: request.body.tyyMember,
    tiviaMember: request.body.tiviaMember,
    role: request.body.role,
    accessRights: request.body.accessRights,
    membershipStarts: request.body.membershipStarts,
    membershipEnds: request.body.membershipEnds,
    accepted: request.body.accepted,
    ...(request.body.password ? { password: request.body.password } : {}),
  }
  const previous = await Member.findOneAndUpdate({ _id: memberID }, adminProfile, {
    runValidators: true,
    returnDocument: 'before',
  }).exec()
  if (!previous) return response.status(404).json(failure('MEMBER_NOT_FOUND', 'Jäsentä ei löytynyt.'))

  if (!previous.accepted && adminProfile.accepted) {
    const email = emails.membershipApprovedMail()
    const mailOptions = {
      from: mail.mailSender,
      to: adminProfile.email,
      subject: email.subject,
      text: email.text,
    }
    mail.sendMailWithLogging(mailOptions, 'membership-approved').catch(() => {})
    mail.logMessage(mailOptions)
  }
  return response.json(httpResponses.onProfileUpdateSuccess)
}

export default { get, update }
