import Member from '../../models/Member.js'
import ResetPassword from '../../models/ResetPassword.js'
import httpResponses from './index.js'
import bcrypt from 'bcrypt'

function resetPassword(request, response) {
  const userID = request.user._id
  const { token } = request.body
  const { password } = request.body
  const { passwordAgain } = request.body

  // Validations

  if (!password || !passwordAgain) {
    return response.json(httpResponses.onEmptyError)
  }

  if (password !== passwordAgain) {
    return response.json(httpResponses.onNotSamePasswordError)
  }

  if (password.length < 6) {
    return response.json(httpResponses.onTooShortPassword)
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
