import mongoose from 'mongoose'

const ProductSchema = new mongoose.Schema<any>({
  productId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['Membership', 'Other'],
    default: 'Membership',
    required: true,
  },
  priceSnt: {
    type: Number,
    required: true,
  },
  membershipDuration: {
    type: Number,
  },
})

export default mongoose.model<any>('Product', ProductSchema) as any
