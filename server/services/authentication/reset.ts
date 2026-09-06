import Member from '../../models/Member.js'
import ResetPassword from '../../models/ResetPassword.js'
import httpResponses from './index.js'
import bcrypt from 'bcrypt'
import { validatePassword } from '../../validators/common.js'

function resetPassword(request, response) {
  const userID = request.user._id
  const { token } = request.body
  const { password } = request.body

  const passwordErrors = validatePassword(request.body, true)
  if (Object.keys(passwordErrors).length > 0) {
    return response.status(400).json({ ...httpResponses.onValidationError, error: { ...httpResponses.onValidationError.error, details: passwordErrors } })
  }

  // Check if link is valid and update member record

  ResetPassword.findOne({
    userID: userID,
    expire: { $gt: Date.now() },
  }).then((resetPasswordRecord) => {
    if (!resetPasswordRecord) return response.json(httpResponses.onInvalidToken)
    bcrypt.compare(token, resetPasswordRecord.resetPasswordToken, function (errBcrypt, resBcrypt) {
      Member.findOneAndUpdate({ _id: userID }, { password: password }).then(() => {
        ResetPassword.findOneAndDelete({ userID: userID }, function (err) {
          if (err) console.log(err)
          return response.json(httpResponses.onPasswordUpdateSuccess)
        })
      })
    })
  })
}

export default {
  resetPassword: resetPassword,
}
