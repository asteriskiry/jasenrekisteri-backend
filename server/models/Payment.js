const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
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
    transactionId: {
        type: String,
    },
    signature: {
        type: String,
    }
});

module.exports = mongoose.model('Payment', PaymentSchema);
