import mongoose from 'mongoose'

export interface ResetPassword {
  userID?: string | mongoose.Types.ObjectId
  resetPasswordToken?: string
  expire?: Date
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
  },
})

export default mongoose.model<ResetPassword>('ResetPassword', ResetPasswordSchema)
