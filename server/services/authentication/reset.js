const Member = require('../../models/Member')
const ResetPassword = require('../../models/ResetPassword')
const httpResponses = require('./')
const bcrypt = require('bcrypt')

function resetPassword(request, response) {
  const { userID } = request.body
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
  }).then(resetPasswordRecord => {
    if (!resetPasswordRecord) return response.json(httpResponses.onInvalidToken)
    bcrypt.compare(token, resetPassword.token, function(errBcrypt, resBcrypt) {
      Member.findOneAndUpdate({ _id: userID }, { password: password }).then(() => {
        ResetPassword.findOneAndDelete({ userID: userID }, function(err) {
          if (err) console.log(err)
          return response.json(httpResponses.onPasswordUpdateSuccess)
        })
      })
    })
  })
}

module.exports = {
  resetPassword: resetPassword,
}
