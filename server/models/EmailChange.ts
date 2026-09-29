import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  email: { type: String, required: true },
  tokenHash: { type: String, required: true },
  credentialDigest: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
})

export default mongoose.model('EmailChange', schema)
