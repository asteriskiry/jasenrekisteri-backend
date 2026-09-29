import Member from '../../models/Member.js'
import ResetPassword from '../../models/ResetPassword.js'
import httpResponses from './index.js'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { validatePassword } from '../../validators/common.js'
import { credentialDigest } from './session.js'
import { ApiError } from '../../utils/errors.js'

async function resetPassword(request, response, next) {
  // Recovery is authorized by the one-time reset token, without a login session.
  const userID = request.body.userID
  const { resetToken: token, password } = request.body

  const passwordErrors = {
    ...(!mongoose.isObjectIdOrHexString(userID) ? { userID: 'Valid member ID is required.' } : {}),
    ...validatePassword(request.body, true),
    ...(!token || typeof token !== 'string' || token.length > 128 ? { resetToken: 'Reset token is required.' } : {}),
  }
  if (Object.keys(passwordErrors).length > 0) {
    return response.status(400).json({
      ...httpResponses.onValidationError,
      error: { ...httpResponses.onValidationError.error, details: passwordErrors },
    })
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

    await mongoose.connection.transaction(async (session) => {
      const consumed = await ResetPassword.findOneAndDelete(
        {
          _id: resetPasswordRecord._id,
          resetPasswordToken: resetPasswordRecord.resetPasswordToken,
          expire: { $gt: new Date() },
        },
        { session }
      )
      if (!consumed) throw new ApiError(410, 'INVALID_TOKEN', 'Linkki vanhentunut.')
      const member = await Member.findById(userID).session(session)
      if (!member || (consumed.credentialDigest && consumed.credentialDigest !== credentialDigest(member.password)))
        throw new ApiError(410, 'INVALID_TOKEN', 'Linkki vanhentunut.')
      member.password = password
      await member.save({ session })
      await ResetPassword.deleteMany({ userID }).session(session)
    })

    return response.json(httpResponses.onPasswordUpdateSuccess)
  } catch (error) {
    return next(error)
  }
}

export default {
  resetPassword: resetPassword,
}
