const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema({
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
    // A Membership product must declare its length so payment completion can
    // compute a new membershipEnds date - see computeMembershipEndDate in
    // server/services/payment/payment.js.
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

module.exports = mongoose.model('Product', ProductSchema)
