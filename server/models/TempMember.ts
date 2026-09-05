import mongoose from 'mongoose'

// This is just for saving temporarily member data when member registers but has not been paid yet

const TempMemberSchema = new mongoose.Schema<any>({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  utuAccount: {
    type: String,
  },
  email: {
    type: String,
    lowercase: true,
    required: true,
  },
  hometown: {
    type: String,
    required: true,
  },
  tyyMember: {
    type: Boolean,
    required: true,
  },
  tiviaMember: {
    type: Boolean,
    required: true,
  },
})

export default mongoose.model<any>('TempMember', TempMemberSchema) as any
