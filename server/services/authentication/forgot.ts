import Member from '../../models/Member.js'
import ResetPassword from '../../models/ResetPassword.js'
import httpResponses from './index.js'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import * as mail from '../../../config/mail.js'
import * as emails from '../../utils/emails.js'

function forgotPassword(request, response) {
  const { email } = request.body

  // Validations

  if (!email) {
    return response.json(httpResponses.onEmailEmpty)
  }

  // Find member by email

  Member.findOne({ email: email })
    .lean()
    .exec()
    .then((user) => {
      if (!user) return response.json(httpResponses.onUserNotFound)

      // If alredy asked for new password, delete last temporary record

      ResetPassword.findOneAndDelete({ userID: user._id }, function (err) {
        if (err) console.log(err)
      })

      // Generate token and expire date and save to temporary database

      const token = crypto.randomBytes(32).toString('hex')
      bcrypt.genSalt(5, function (err, salt) {
        if (err) console.log(err)
        bcrypt.hash(token, salt, function (err, hash) {
          if (err) console.log(err)
          ResetPassword.create({
            userID: user._id,
            resetPasswordToken: hash,
            expire: Date.now() + 3600000,
          }).then(function (item) {
            if (!item) return response.json(httpResponses.onResetFail)

            // Send generated link to email

            let forgotMail = emails.forgotMail(user._id, token)

            let mailOptions = {
              from: mail.mailSender,
              to: user.email,
              subject: forgotMail.subject,
              text: forgotMail.text,
            }
            mail.transporter.sendMail(mailOptions, mail.callback)
            mail.logMessage(mailOptions)
            return response.json(httpResponses.onMailSent)
          })
        })
      })
    })
    .catch((error) => response.json({ success: false, message: error }))
}

export default {
  forgotPassword: forgotPassword,
}
