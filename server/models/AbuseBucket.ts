import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  _id: String,
  hits: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
})

export default mongoose.model('AbuseBucket', schema)
