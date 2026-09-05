import mongoose from 'mongoose'

export interface EndedMembership {
  userID?: string | mongoose.Types.ObjectId
  mailSent?: Date
}

const EndedMembershipSchema = new mongoose.Schema<EndedMembership>({
  userID: {
    type: String,
  },
  mailSent: {
    type: Date,
  },
})

export default mongoose.model<EndedMembership>('EndedMembership', EndedMembershipSchema)
