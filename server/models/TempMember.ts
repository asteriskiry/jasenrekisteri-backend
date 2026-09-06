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
    trim: true,
    minlength: 2,
    maxlength: 20,
    required: true,
  },
  lastName: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 25,
    required: true,
  },
  utuAccount: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    required: true,
    validate: {
      validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Email address is invalid.',
    },
  },
  hometown: {
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 25,
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
