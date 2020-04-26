const Member = require('../../models/Member')

const utils = require('../../utils')
const httpResponses = require('./')
const mail = require('../../../config/mail')
const emails = require('../../utils/emails')

// Remove member

function remove(request, response) {
  const accessTo = request.body.access.toLowerCase()

  if (accessTo === 'admin' || accessTo === 'board') {
    utils.checkUserControl(request.body.id).then(admin => {
      Member.deleteOne({ _id: request.body.memberID }, function(err) {
        if (err) response.json(err)

        response.json({ success: true, message: 'Jäsen poistettu.' })

        let email = emails.memberDeletedMail()
        let memberMailOptions = {
          from: mail.mailSender,
          to: request.body.email,
          subject: email.subject,
          text: email.text,
        }

        mail.transporter.sendMail(memberMailOptions, mail.callback)
      })
    })
  } else {
    return response.json(httpResponses.clientAdminFailed)
  }
}

module.exports = {
  remove: remove,
}
