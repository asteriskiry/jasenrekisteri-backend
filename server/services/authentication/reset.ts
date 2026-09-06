import Member from '../../models/Member.js'
import ResetPassword from '../../models/ResetPassword.js'
import httpResponses from './index.js'
import bcrypt from 'bcrypt'
import { validatePassword } from '../../validators/common.js'

async function resetPassword(request, response, next) {
  const userID = request.user._id
  const { resetToken: token, password } = request.body

  const passwordErrors = {
    ...validatePassword(request.body, true),
    ...(!token || typeof token !== 'string' ? { resetToken: 'Reset token is required.' } : {}),
  }
  if (Object.keys(passwordErrors).length > 0) {
    return response.status(400).json({ ...httpResponses.onValidationError, error: { ...httpResponses.onValidationError.error, details: passwordErrors } })
  }

  try {
    const resetPasswordRecord = await ResetPassword.findOne({
      userID: userID,
      expire: { $gt: Date.now() },
    }).lean()

    if (!resetPasswordRecord) {
      return response.status(410).json(httpResponses.onInvalidToken)
    }

    const resBcrypt = await bcrypt.compare(token, resetPasswordRecord.resetPasswordToken)
    if (!resBcrypt) {
      return response.status(410).json(httpResponses.onInvalidToken)
    }

    await Member.findOneAndUpdate({ _id: userID }, { password: password })
    await ResetPassword.findOneAndDelete({ userID: userID })

    return response.json(httpResponses.onPasswordUpdateSuccess)
  } catch (error) {
    return next(error)
  }
}

export default {
  resetPassword: resetPassword,
}
