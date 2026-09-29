import mongoose from 'mongoose'

const LoginSessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  credentialDigest: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
})

export default mongoose.model('LoginSession', LoginSessionSchema)
