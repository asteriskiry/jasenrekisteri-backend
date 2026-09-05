import mongoose from 'mongoose'

const ResetPasswordSchema = new mongoose.Schema<any>({
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

export default mongoose.model<any>('ResetPassword', ResetPasswordSchema) as any
