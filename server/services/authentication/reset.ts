import Member from '../../models/Member.js'
import ResetPassword from '../../models/ResetPassword.js'
import httpResponses from './index.js'
import bcrypt from 'bcrypt'

async function resetPassword(request, response) {
  const { userID, resetToken, password, passwordAgain } = request.body
  const token = resetToken

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

  try {
    const resetPasswordRecord = await ResetPassword.findOne({
      userID: userID,
      expire: { $gt: Date.now() },
    }).lean()

    if (!resetPasswordRecord) {
      return response.json(httpResponses.onInvalidToken)
    }

    const resBcrypt = await bcrypt.compare(token, resetPasswordRecord.resetPasswordToken)
    if (!resBcrypt) {
      return response.json(httpResponses.onInvalidToken)
    }

    await Member.findOneAndUpdate({ _id: userID }, { password: password })
    await ResetPassword.findOneAndDelete({ userID: userID })

    return response.json(httpResponses.onPasswordUpdateSuccess)
  } catch (error) {
    console.error('[RESET_PASSWORD_ERROR]', error && error.message)
    return response.json({
      success: false,
      message: error.message || String(error),
    })
  }
}

export default {
  resetPassword: resetPassword,
}
