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
    trim: true,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    trim: true,
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
    min: 0,
  },
  membershipDuration: {
    type: Number,
    min: 1,
    // Required so payment completion can compute a membershipEnds date.
    required: function () {
      return this.category === 'Membership'
    },
  },
  stripeProductId: {
    type: String,
  },
  stripePriceId: {
    type: String,
  },
})

export default mongoose.model<Product>('Product', ProductSchema)
