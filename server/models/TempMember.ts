import mongoose from 'mongoose'
import { isValidUtuAccount } from '../validators/common.js'

export interface TempMember {
  firstName: string
  lastName: string
  utuAccount?: string
  email: string
  hometown: string
  tyyMember: boolean
  tiviaMember: boolean
  registrationKey?: string
  expiresAt?: Date
}

// This is just for saving temporarily member data when member registers but has not been paid yet

const TempMemberSchema = new mongoose.Schema<TempMember>({
  // Sparse key permits existing payment-linked records to survive deployment.
  registrationKey: { type: String, unique: true, sparse: true },
  expiresAt: { type: Date, expires: 0 },
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
    validate: { validator: isValidUtuAccount, message: 'UTU account is invalid.' },
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
