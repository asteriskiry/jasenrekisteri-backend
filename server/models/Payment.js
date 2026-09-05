const mongoose = require('mongoose')

const PaymentSchema = new mongoose.Schema({
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
    requird: true,
  },
  productName: {
    type: String,
    requird: true,
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
  // Snapshot of Product.membershipDuration at payment time. Absent for
  // non-membership ('Other' category) products.
  membershipDuration: {
    type: Number,
  },
  // Money was collected but membership couldn't be resolved automatically.
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
})

module.exports = mongoose.model('Payment', PaymentSchema)
