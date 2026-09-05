import mongoose from 'mongoose'

export interface Product {
  productId: string
  name: string
  category: 'Membership' | 'Other'
  priceSnt: number
  membershipDuration?: number
  stripeProductId?: string
  stripePriceId?: string
}

const ProductSchema = new mongoose.Schema<Product>({
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
  stripeProductId: {
    type: String,
  },
  stripePriceId: {
    type: String,
  },
})

export default mongoose.model<Product>('Product', ProductSchema)
