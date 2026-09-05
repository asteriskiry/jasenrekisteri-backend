import mongoose from 'mongoose'

export interface TempMember {
  firstName: string
  lastName: string
  utuAccount?: string
  email: string
  hometown: string
  tyyMember: boolean
  tiviaMember: boolean
}

// This is just for saving temporarily member data when member registers but has not been paid yet

const TempMemberSchema = new mongoose.Schema<TempMember>({
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

export default mongoose.model<TempMember>('TempMember', TempMemberSchema)
