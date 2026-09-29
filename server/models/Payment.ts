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
  receiptExpiresAt?: Date
  status: 'Canceled' | 'Pending' | 'Success' | 'Failed' | 'Expired'
  reference?: string
  processed: boolean
  membershipDuration?: number
  needsManualReview?: boolean
  reviewReason?: string
  checkoutKey?: string
  membershipEnds?: Date
  newMember?: boolean
  notifiedAt?: Date
  notificationError?: string
  notificationLease?: Date
  livemode?: boolean
  stripeCheckoutSessionId?: string
  stripePaymentIntentId?: string
  registration?: {
    firstName: string
    lastName: string
    email: string
    hometown: string
    utuAccount?: string
    tyyMember: boolean
    tiviaMember: boolean
  }
}

const PaymentSchema = new mongoose.Schema<Payment>({
  // Preserve a paid registration even after the pending-registration TTL expires.
  registration: {
    type: new mongoose.Schema(
      {
        firstName: String,
        lastName: String,
        email: String,
        hometown: String,
        utuAccount: String,
        tyyMember: Boolean,
        tiviaMember: Boolean,
      },
      { _id: false }
    ),
    default: undefined,
  },
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
  receiptExpiresAt: Date,
  status: {
    type: String,
    enum: ['Canceled', 'Pending', 'Success', 'Failed', 'Expired'],
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
  membershipDuration: {
    type: Number,
  },
  needsManualReview: {
    type: Boolean,
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
  reviewReason: String,
  checkoutKey: { type: String, unique: true, sparse: true },
  membershipEnds: Date,
  newMember: Boolean,
  notifiedAt: Date,
  notificationError: String,
  notificationLease: Date,
  livemode: Boolean,
})

export default mongoose.model<Payment>('Payment', PaymentSchema)
