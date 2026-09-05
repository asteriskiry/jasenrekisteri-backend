const Member = require('../../models/Member')

const utils = require('../../utils')
const httpResponses = require('./')
const mail = require('../../../config/mail')
const emails = require('../../utils/emails')

// Remove member

async function remove(request, response) {
  const accessTo = request.user.role.toLowerCase()

  if (accessTo === 'admin' || accessTo === 'board') {
    try {
      await utils.checkUserControl(request.user._id)
      await Member.deleteOne({ _id: request.body.memberID })
      response.json({ success: true, message: 'Jäsen poistettu.' })

      let email = emails.memberDeletedMail()
      let memberMailOptions = {
        from: mail.mailSender,
        to: request.body.email,
        subject: email.subject,
        text: email.text,
      }

      mail.transporter.sendMail(memberMailOptions, mail.callback)
      mail.logMessage(memberMailOptions)
    } catch (error) {
      return response.json(error)
    }
  } else {
    return response.json(httpResponses.clientAdminFailed)
  }
}

module.exports = {
  remove: remove,
}
