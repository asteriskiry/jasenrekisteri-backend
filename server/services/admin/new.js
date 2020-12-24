const generator = require('generate-password')
const moment = require('moment')
const validator = require('validator')

const Member = require('../../models/Member')
const utils = require('../../utils')
const httpResponses = require('./')
const mail = require('../../../config/mail')
const config = require('../../../config/config')
const formatters = require('../../utils/formatters')
const emails = require('../../utils/emails')

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

  const accessTo = request.body.access.toLowerCase()

  // Client side access check and validations

  if (accessTo === 'admin') {
    if (!firstName || !lastName || !email || !hometown || !role || !membershipStarts || !membershipEnds) {
      return response.json(httpResponses.onAllFieldEmpty)
    } else if (
      !validator.matches(firstName, /[a-zA-Z\u00c0-\u017e- ]{2,20}$/g) ||
      !validator.matches(lastName, /[a-zA-Z\u00c0-\u017e- ]{2,25}$/g) ||
      !validator.isEmail(email) ||
      !validator.matches(hometown, /[a-zA-Z\u00c0-\u017e- ]{2,25}$/g) ||
      !typeof tyyMember === 'boolean' ||
      !typeof tiviaMember === 'boolean' ||
      !typeof accessRights === 'boolean' ||
      !typeof accepted === 'boolean' ||
      !validator.isIn(role, ['Admin', 'Board', 'Member', 'Functionary']) ||
      !validator.isISO8601(membershipStarts) ||
      !validator.isISO8601(membershipEnds)
    ) {
      return response.json(httpResponses.onValidationError)
    }

    const password = generator.generate({
      length: 8,
      numbers: true,
    })

    // Server side access check and save new member

    utils
      .checkAdminControl(request.body.id)
      .then(user => {
        let newMember = new Member()
        newMember.firstName = formatters.capitalizeFirstLetter(firstName)
        newMember.lastName = formatters.capitalizeFirstLetter(lastName)
        newMember.utuAccount = utuAccount.toLowerCase()
        newMember.email = email.toLowerCase()
        newMember.hometown = formatters.capitalizeFirstLetter(hometown)
        newMember.tyyMember = !!tyyMember
        newMember.tiviaMember = !!tiviaMember
        newMember.role = role
        newMember.accessRights = !!accessRights
        newMember.membershipStarts = membershipStarts
        newMember.membershipEnds = membershipEnds
        newMember.accountCreated = new Date()
        newMember.accepted = !!accepted
        newMember.password = password

        newMember.save(error => {
          if (error) return response.json(httpResponses.onMustBeUnique)

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
            mail.transporter.sendMail(importMailOptions, mail.callback)
            mail.logMessage(importMailOptions)
          } else {
            mail.transporter.sendMail(boardMailOptions, mail.callback)
            mail.logMessage(boardMailOptions)
            mail.transporter.sendMail(memberMailOptions, mail.callback)
            mail.logMessage(memberMailOptions)
          }

          return response.json(httpResponses.memberAddedSuccessfully)
        })
      })
      .catch(error => {
        return response.json(error)
      })
  } else {
    return response.json(httpResponses.clientAdminFailed)
  }
}

module.exports = {
  save: save,
}
