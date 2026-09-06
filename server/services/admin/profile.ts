import Member from '../../models/Member.js'

import utils from '../../utils/index.js'
import httpResponses from './index.js'
import * as mail from '../../../config/mail.js'
import formatters from '../../utils/formatters.js'
import { validatePassword, validatePersonFields } from '../../validators/common.js'
import * as emails from '../../utils/emails.js'

// Get member details

async function get(request, response) {
  const memberID = request.query.memberID

  const userRole = request.user.role.toLowerCase()

  // Check access and return member details

  if (userRole !== 'admin' && userRole !== 'board') {
    return response.json(httpResponses.clientAdminFailed)
  }

  try {
    await utils.checkUserControl(request.user._id)
    const doc = await Member.findOne({ _id: memberID }).lean().exec()
    if (!doc) return response.json({ memberNotFound: true })
    delete doc.password
    return response.json(doc)
  } catch (error) {
    console.log(error)
    return response.json(httpResponses.onServerAdminFail)
  }
}

// Update member details

async function update(request, response) {
  const memberID = request.body.memberID

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

  // Updated member data

  const adminProfile = {
    firstName: formatters.capitalizeFirstLetter(request.body.firstName),
    lastName: formatters.capitalizeFirstLetter(request.body.lastName),
    utuAccount: request.body.utuAccount ? request.body.utuAccount.toLowerCase() : '',
    email: request.body.email.toLowerCase(),
    hometown: formatters.capitalizeFirstLetter(request.body.hometown),
    tyyMember: !!request.body.tyyMember,
    tiviaMember: !!request.body.tiviaMember,
    role: request.body.role,
    accessRights: !!request.body.accessRights,
    membershipStarts: request.body.membershipStarts,
    membershipEnds: request.body.membershipEnds,
    accepted: !!request.body.accepted,
    password: request.body.password,
  }

  // Check client side access

  const accessTo = request.user.role.toLowerCase()

  if (accessTo === 'admin') {
    if (request.body.password === '' || request.body.password === null) {
      delete adminProfile.password
    } else if (request.body.password.length < 6) {
      return response.status(400).json(httpResponses.onTooShortPassword)
    }

    // Send mail to member if member is just accepted

    try {
      await utils.checkAdminControl(request.user._id)
      const existingMember = await Member.findOne({ _id: memberID }).lean().exec()
      if (existingMember && !existingMember.accepted && adminProfile.accepted) {
        let email = emails.membershipApprovedMail()
        let mailOptions = {
          from: mail.mailSender,
          to: adminProfile.email,
          subject: email.subject,
          text: email.text,
        }
        mail.transporter.sendMail(mailOptions, mail.callback)
        mail.logMessage(mailOptions)
      }
    } catch (error) {
      console.log(error)
      return response.json(httpResponses.onServerAdminFail)
    }

    // Save member details
    try {
      await utils.checkUserControl(request.user._id)
      await Member.findOneAndUpdate({ _id: memberID }, adminProfile).exec()
      return response.json(httpResponses.onProfileUpdateSuccess)
    } catch (error) {
      console.log(error)
      return response.json(httpResponses.onMustBeUnique)
    }
  } else {
    return response.json(httpResponses.clientAdminFailed)
  }
}

export default {
  get: get,
  update: update,
}
