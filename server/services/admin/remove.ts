import Member from '../../models/Member.js'

import utils from '../../utils/index.js'
import httpResponses from './index.js'
import * as mail from '../../../config/mail.js'
import * as emails from '../../utils/emails.js'

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

export default {
  remove: remove,
}
