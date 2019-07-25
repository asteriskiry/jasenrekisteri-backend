'use strict';

require('dotenv').config();

const CheckoutFinland = require('checkout-finland');
const uuidv1 = require('uuid/v1');
const httpResponses = require('./');

const Member = require('../../models/Member');
const Payment = require('../../models/Payment');
const Product = require('../../models/Product');

// Work in progress

// Initialize Checkout API
const client = new CheckoutFinland(
    process.env.MERCHANT_ID,
    process.env.MERCHANT_SECRET
);

// Create payment
async function createPayment(request, response) {
    let memberId = request.body.memberId;
    let productId = request.body.productId;

    Member.findOne({ _id: memberId }, (error, member) => {
        if (error || !member)
            return response.json(httpResponses.onError);
        const memberObj = member.toObject();

        Product.findOne({ productId: productId }, (error, product) => {
            if (error || !product)
                return response.json(httpResponses.onError);
            const productObj = product.toObject();
        });
    });

    // Payment record
    let record = {
        firstName: firstName,
        lastName: lastName,
        userId: id,
        email: email,
        hometown: hometown,
    };

    // Payment request data
    const payment = {
        stamp: uuidv1(),
        reference: '3759170',
        amount: 500,
        currency: 'EUR',
        language: 'FI',
        items: [
            {
                unitPrice: 500,
                units: 1,
                vatPercentage: 0,
                productCode: '#1234',
                deliveryDate: '2018-09-01',
                stamp: uuidv1(),
                merchant: process.env.MERCHANT_ID,
                reference: 'kurssi-1',
            },
        ],
        customer: {
            email: 'test.customer@example.com',
        },
        redirectUrls: {
            success: process.env.CLIENTURL + '/member/pay/thanks',
            cancel: process.env.CLIENTURL + '/member/pay/cancel',
        },
    };

    // Create paymnet request to Checkout API
    const checkoutResponse = await client.createPayment(payment);

    // Return banks to frontend
    return response.json(checkoutResponse.providers);
}

// When payment is made frontend calls this endpoint
function paymentSuccess(request, response) {
    console.log(requst);
    return response.send('Thanks for your purchase!');
}

module.exports = {
    createPayment: createPayment,
    paymentSuccess: paymentSuccess,
};
