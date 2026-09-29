import generator from 'generate-password'
import mongoose from 'mongoose'
import moment from 'moment'
import { validatePersonFields } from '../../validators/common.js'

import Member from '../../models/Member.js'
import utils from '../../utils/index.js'
import httpResponses from './index.js'
import * as mail from '../../../config/mail.js'
import config from '../../../config/config.js'
import formatters from '../../utils/formatters.js'
import * as emails from '../../utils/emails.js'
import { appendMemberAudit, memberAuditValues } from './audit.js'

const roleSwitchCase = formatters.roleSwitchCase

async function save(request, response) {
  const {
    firstName,
    lastName,
    utuAccount,
    email,
    hometown,
    tyyMember,
    tiviaMember,
    role,
    accessRights,
    membershipStarts,
    membershipEnds,
    accepted,
  } = request.body

  const userRole = request.user.role.toLowerCase()

  const toIsoString = (value) => {
    if (!value) return value
    if (typeof value === 'string') return value
    if (value instanceof Date) return value.toISOString()
    if (value && typeof value.toISOString === 'function') return value.toISOString()
    return value
  }

  const normalizedMembershipStarts = toIsoString(membershipStarts)
  const normalizedMembershipEnds = toIsoString(membershipEnds)
  const normalizedTyyMember = tyyMember ?? false
  const normalizedTiviaMember = tiviaMember ?? false
  const normalizedAccessRights = accessRights ?? false
  const normalizedAccepted = accepted ?? false

  if (userRole === 'admin') {
    if (!firstName || !lastName || !email || !hometown || !role || !membershipStarts || !membershipEnds) {
      return response.status(400).json(httpResponses.onAllFieldEmpty)
    } else {
      const errors = validatePersonFields(
        {
          ...request.body,
          membershipStarts: normalizedMembershipStarts,
          membershipEnds: normalizedMembershipEnds,
          tyyMember: normalizedTyyMember,
          tiviaMember: normalizedTiviaMember,
          accessRights: normalizedAccessRights,
          accepted: normalizedAccepted,
        },
        true
      )
      if (Object.keys(errors).length > 0) {
        return response.status(400).json({
          ...httpResponses.onValidationError,
          error: { ...httpResponses.onValidationError.error, details: errors },
        })
      }
    }

    const password = generator.generate({
      length: 8,
      numbers: true,
    })

    await utils.checkAdminControl(request.user._id)
    await mongoose.connection.transaction(async (session) => {
      let newMember = new Member()
      newMember.firstName = formatters.capitalizeFirstLetter(firstName)
      newMember.lastName = formatters.capitalizeFirstLetter(lastName)
      newMember.utuAccount = utuAccount ? utuAccount.toLowerCase() : ''
      newMember.email = email.toLowerCase()
      newMember.hometown = formatters.capitalizeFirstLetter(hometown)
      newMember.tyyMember = normalizedTyyMember
      newMember.tiviaMember = normalizedTiviaMember
      newMember.role = role
      newMember.accessRights = normalizedAccessRights
      newMember.membershipStarts = normalizedMembershipStarts
      newMember.membershipEnds = normalizedMembershipEnds
      newMember.accountCreated = new Date()
      newMember.accepted = normalizedAccepted
      newMember.password = password

      await newMember.save({ session })
      await appendMemberAudit({
        actor: request.user,
        targetId: newMember._id,
        action: 'member.created',
        after: memberAuditValues(newMember),
        session,
      })
    })

    let memberAddedBoardMail = emails.memberAddedBoardMail(
      firstName,
      lastName,
      utuAccount,
      email,
      hometown,
      tyyMember ? 'Kyllä' : 'Ei',
      tiviaMember ? 'Kyllä' : 'Ei',
      roleSwitchCase(role),
      accessRights ? 'Kyllä' : 'Ei',
      moment(membershipStarts).format('DD.MM.YYYY'),
      moment(membershipEnds).format('DD.MM.YYYY'),
      accepted ? 'Kyllä' : 'Ei'
    )

    let boardMailOptions = {
      from: mail.mailSender,
      to: mail.boardMailAddress,
      subject: memberAddedBoardMail.subject,
      text: memberAddedBoardMail.text,
    }

    let memberAddedMemberMail = emails.memberAddedMemberMail(
      firstName,
      lastName,
      utuAccount,
      email,
      hometown,
      tyyMember ? 'Kyllä' : 'Ei',
      tiviaMember ? 'Kyllä' : 'Ei',
      roleSwitchCase(role),
      accessRights ? 'Kyllä' : 'Ei',
      moment(membershipStarts).format('DD.MM.YYYY'),
      moment(membershipEnds).format('DD.MM.YYYY'),
      accepted ? 'Kyllä' : 'Ei',
      password
    )

    let memberMailOptions = {
      from: mail.mailSender,
      to: email,
      subject: memberAddedMemberMail.subject,
      text: memberAddedMemberMail.text,
    }

    let importMail = emails.importMail(
      firstName,
      lastName,
      utuAccount,
      email,
      hometown,
      tyyMember ? 'Kyllä' : 'Ei',
      tiviaMember ? 'Kyllä' : 'Ei',
      roleSwitchCase(role),
      accessRights ? 'Kyllä' : 'Ei',
      moment(membershipStarts).format('DD.MM.YYYY'),
      moment(membershipEnds).format('DD.MM.YYYY'),
      accepted ? 'Kyllä' : 'Ei',
      password
    )

    let importMailOptions = {
      from: mail.mailSender,
      to: email,
      subject: importMail.subject,
      text: importMail.text,
    }

    if (config.importMode === '1') {
      mail
        .sendMailWithLogging(importMailOptions, 'member-import-mail')
        .catch((error) => console.error('[ADMIN_NEW_MEMBER_MAIL]', error && error.message))
      mail.logMessage(importMailOptions)
    } else {
      mail
        .sendMailWithLogging(boardMailOptions, 'member-board-mail')
        .catch((error) => console.error('[ADMIN_NEW_MEMBER_MAIL]', error && error.message))
      mail.logMessage(boardMailOptions)
      mail
        .sendMailWithLogging(memberMailOptions, 'member-user-mail')
        .catch((error) => console.error('[ADMIN_NEW_MEMBER_MAIL]', error && error.message))
      mail.logMessage(memberMailOptions)
    }

    return response.json(httpResponses.memberAddedSuccessfully)
  } else {
    return response.status(403).json(httpResponses.clientAdminFailed)
  }
}

export default {
  save: save,
}
