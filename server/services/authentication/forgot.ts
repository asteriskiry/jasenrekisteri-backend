import Member from '../../models/Member.js'
import ResetPassword from '../../models/ResetPassword.js'
import httpResponses from './index.js'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import * as mail from '../../../config/mail.js'
import * as emails from '../../utils/emails.js'
import { validateEmail } from '../../validators/common.js'

async function forgotPassword(request, response, next) {
  const { email } = request.body

  if (!email) {
    return response.status(400).json(httpResponses.onEmailEmpty)
  }
  if (Object.keys(validateEmail(request.body)).length > 0) {
    return response.status(400).json(httpResponses.onValidationError)
  }

  // Find member by email

  try {
    const user = await Member.findOne({ email: email }).lean()
    if (!user) return response.json(httpResponses.onUserNotFound)

    // If alredy asked for new password, delete last temporary record

    await ResetPassword.findOneAndDelete({ userID: user._id })

    // Generate token and expire date and save to temporary database

    const token = crypto.randomBytes(32).toString('hex')
    const hash = await bcrypt.hash(token, 5)
    await ResetPassword.create({
      userID: user._id,
      resetPasswordToken: hash,
      expire: Date.now() + 3600000,
    })

    const forgotMail = emails.forgotMail(user._id, token)
    const mailOptions = {
      from: mail.mailSender,
      to: user.email,
      subject: forgotMail.subject,
      text: forgotMail.text,
    }

    try {
      await mail.sendMailWithLogging(mailOptions, 'forgot-password-mail')
      mail.logMessage(mailOptions)
      return response.json(httpResponses.onMailSent)
    } catch (error) {
      console.error('[FORGOT_PASSWORD_MAIL_ERROR]', error && error.message)
      mail.logMessage(mailOptions)
      return response.status(503).json(httpResponses.onMailFail)
    }
  } catch (error) {
    return next(error)
  }
}

export default {
  forgotPassword: forgotPassword,
}
