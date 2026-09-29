import mongoose from 'mongoose'

export interface ResetPassword {
  userID?: string | mongoose.Types.ObjectId
  resetPasswordToken?: string
  expire?: Date
  credentialDigest?: string
  verificationNonce?: string
}

const ResetPasswordSchema = new mongoose.Schema<ResetPassword>({
  userID: {
    type: String,
  },
  resetPasswordToken: {
    type: String,
  },
  expire: {
    type: Date,
    expires: 0,
  },
  credentialDigest: String,
  verificationNonce: String,
})

export default mongoose.model<ResetPassword>('ResetPassword', ResetPasswordSchema)
