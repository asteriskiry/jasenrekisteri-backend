import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

// Main member schema

const MemberSchema = new mongoose.Schema<any>({
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
  const update: any = this.getUpdate()
  if (update.password !== '' && update.password !== undefined) {
    ;(this.getUpdate() as any).password = await bcrypt.hash(update.password, 10)
  }
})

// Password comparing
MemberSchema.methods.comparePassword = function (pw) {
  return bcrypt.compare(pw, this.password)
}

export default mongoose.model<any>('Member', MemberSchema) as any
