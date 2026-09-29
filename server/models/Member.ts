import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { isValidUtuAccount, validatePassword } from '../validators/common.js'

export interface Member {
  firstName: string
  lastName: string
  utuAccount?: string
  email: string
  hometown: string
  tyyMember: boolean
  tiviaMember: boolean
  role: 'Admin' | 'Board' | 'Functionary' | 'Member'
  accessRights: boolean
  password: string
  membershipStarts?: Date
  membershipEnds?: Date
  accountCreated: Date
  accepted: boolean
  comparePassword(password: string): Promise<boolean>
}

// Main member schema

const MemberSchema = new mongoose.Schema<Member>({
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
    trim: true,
    lowercase: true,
    unique: true,
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
  role: {
    type: String,
    enum: ['Admin', 'Board', 'Functionary', 'Member'],
    default: 'Member',
    required: true,
  },
  accessRights: {
    type: Boolean,
    required: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  membershipStarts: {
    type: Date,
  },
  membershipEnds: {
    type: Date,
  },
  accountCreated: {
    type: Date,
    required: true,
  },
  accepted: {
    type: Boolean,
    required: true,
  },
})

async function hashPassword(password: unknown) {
  if (Object.keys(validatePassword({ password, passwordAgain: password }, true)).length) {
    const error = new mongoose.Error.ValidationError()
    error.addError(
      'password',
      new mongoose.Error.ValidatorError({ path: 'password', message: 'Password must be at least 6 characters.' })
    )
    throw error
  }
  return bcrypt.hash(password, 10)
}

// Validate plaintext before hashing: database length validation sees the hash on updates.
MemberSchema.pre('save', async function () {
  if (this.isModified('password') || this.isNew) {
    this.password = await hashPassword(this.password)
  }
})

MemberSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate() as mongoose.UpdateQuery<Member>
  if (Object.hasOwn(update, 'password')) update.password = await hashPassword(update.password)
  if (update.$set && Object.hasOwn(update.$set, 'password'))
    update.$set.password = await hashPassword(update.$set.password)
})

// Password comparing
MemberSchema.methods.comparePassword = function (pw) {
  return bcrypt.compare(pw, this.password)
}

export default mongoose.model<Member>('Member', MemberSchema)
