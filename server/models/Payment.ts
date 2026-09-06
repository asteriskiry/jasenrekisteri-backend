import mongoose from 'mongoose'

export interface Payment {
  memberId: string | mongoose.Types.ObjectId
  firstName: string
  lastName: string
  email: string
  hometown: string
  timestamp: Date
  productId: string
  productName: string
  amountSnt: number
  stamp: string
  status: 'Canceled' | 'Pending' | 'Success'
  reference?: string
  processed: boolean
  stripeCheckoutSessionId?: string
  stripePaymentIntentId?: string
}

const PaymentSchema = new mongoose.Schema<Payment>({
  memberId: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  hometown: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  productId: {
    type: String,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  amountSnt: {
    type: Number,
    required: true,
  },
  stamp: {
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    enum: ['Canceled', 'Pending', 'Success'],
    default: 'Pending',
    required: true,
  },
  reference: {
    type: String,
  },
  processed: {
    type: Boolean,
    required: true,
    default: false,
  },
  stripeCheckoutSessionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  stripePaymentIntentId: {
    type: String,
  },
})

export default mongoose.model<Payment>('Payment', PaymentSchema)
