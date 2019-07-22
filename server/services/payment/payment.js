'use strict';

require('dotenv').config();

const CheckoutFinland = require('checkout-finland');
const uuidv1 = require('uuid/v1');

// Work in progress

const client = new CheckoutFinland(
    process.env.MERCHANT_ID,
    process.env.MERCHANT_SECRET
);

// Main stuff happens here
async function createPayment(request, response) {
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
        }
    };
    const checkoutResponse = await client.createPayment(payment);
    return response.json(checkoutResponse.providers);
}

function paymentSuccess(request, response) {
    console.log(response);
    return response.send('Thanks for your purchase!');
}

module.exports = {
    createPayment: createPayment,
    paymentSuccess: paymentSuccess,
};
