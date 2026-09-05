import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

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
    unique: true,
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

// Hash passwords
MemberSchema.pre('save', async function () {
  if (this.isModified('password') || this.isNew) {
    this.password = await bcrypt.hash(this.password, 10)
  }
})

// Update password and hash it if it is not empty
MemberSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate() as mongoose.UpdateQuery<Member>
  if (update.password !== '' && update.password !== undefined) {
    update.password = await bcrypt.hash(update.password, 10)
  }
})

// Password comparing
MemberSchema.methods.comparePassword = function (pw) {
  return bcrypt.compare(pw, this.password)
}

export default mongoose.model<Member>('Member', MemberSchema)
