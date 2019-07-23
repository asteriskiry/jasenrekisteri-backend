'use strict';

require('dotenv').config();

const CheckoutFinland = require('checkout-finland');
const uuidv1 = require('uuid/v1');
const httpResponses = require('./');

// Work in progress

// Initialize Checkout API
const client = new CheckoutFinland(
    process.env.MERCHANT_ID,
    process.env.MERCHANT_SECRET
);

// Create payment
async function createPayment(request, response) {
    let firstName = request.body.firstName;
    let lastName = request.body.lastName;
    let id = request.body.id;
    let email = request.body.email;
    let hometown = request.body.hometown;
    let membershipLength = parseInt(request.body.membershipLength, 10);

    // Validate
    if (
        !(membershipLength === 1 || membershipLength === 5) ||
        !firstName ||
        !lastName ||
        !id ||
        !email ||
        !hometown
    ) {
        return response.json(httpResponses.onError);
    }

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
