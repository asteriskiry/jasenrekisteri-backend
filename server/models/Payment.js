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
        lowercase: true,
        unique: true,
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
        required: true,
    },
    status: {
        type: String,
        enum: ['Canceled', 'Pendind', 'Success'],
        default: 'Pending',
        required: true,
    },
});

module.exports = mongoose.model('Payment', PaymentSchema);
