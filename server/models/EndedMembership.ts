import mongoose from 'mongoose'

const EndedMembershipSchema = new mongoose.Schema<any>({
  userID: {
    type: String,
  },
  mailSent: {
    type: Date,
  },
})

export default mongoose.model<any>('EndedMembership', EndedMembershipSchema) as any
