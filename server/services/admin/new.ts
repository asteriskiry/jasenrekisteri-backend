import generator from 'generate-password'
import moment from 'moment'
import validator from 'validator'

import Member from '../../models/Member.js'
import utils from '../../utils/index.js'
import httpResponses from './index.js'
import * as mail from '../../../config/mail.js'
import config from '../../../config/config.js'
import formatters from '../../utils/formatters.js'
import * as emails from '../../utils/emails.js'

const roleSwitchCase = formatters.roleSwitchCase

// Add new member

function save(request, response) {
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

  // Client side access check and validations

  if (userRole === 'admin') {
    if (!firstName || !lastName || !email || !hometown || !role || !membershipStarts || !membershipEnds) {
      return response.json(httpResponses.onAllFieldEmpty)
    } else if (
      !validator.matches(firstName, /[a-zA-Z\u00c0-\u017e- ]{2,20}$/g) ||
      !validator.matches(lastName, /[a-zA-Z\u00c0-\u017e- ]{2,25}$/g) ||
      !validator.isEmail(email) ||
      !validator.matches(hometown, /[a-zA-Z\u00c0-\u017e- ]{2,25}$/g) ||
      typeof normalizedTyyMember !== 'boolean' ||
      typeof normalizedTiviaMember !== 'boolean' ||
      typeof normalizedAccessRights !== 'boolean' ||
      typeof normalizedAccepted !== 'boolean' ||
      !validator.isIn(role, ['Admin', 'Board', 'Member', 'Functionary']) ||
      !validator.isISO8601(normalizedMembershipStarts) ||
      !validator.isISO8601(normalizedMembershipEnds)
    ) {
      return response.json(httpResponses.onValidationError)
    }

    const password = generator.generate({
      length: 8,
      numbers: true,
    })

    // Server side access check and save new member

    utils
      .checkAdminControl(request.user._id)
      .then(user => {
        let newMember = new Member()
        newMember.firstName = formatters.capitalizeFirstLetter(firstName)
        newMember.lastName = formatters.capitalizeFirstLetter(lastName)
        newMember.utuAccount = utuAccount.toLowerCase()
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

        newMember
          .save()
          .then(() => {
            // Send mail to board and member

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
          })
          .catch(() => response.json(httpResponses.onMustBeUnique))
      })
      .catch((error) => {
        return response.json(error)
      })
  } else {
    return response.json(httpResponses.clientAdminFailed)
  }
}

export default {
  save: save,
}
