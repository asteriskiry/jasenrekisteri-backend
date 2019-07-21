'use strict';

require('dotenv').config();

const CheckoutFinland = require('checkout-finland');
const uuidv1 = require('uuid/v1');

const client = new CheckoutFinland(
    process.env.MERCHANT_ID,
    process.env.MERCHANT_SECRET
);

// Main stuff happens here
async function pay(request, response) {
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
            success: 'https://localhost:3000/member/pay/thanks',
            cancel: 'https://localhost:3000/member/pay/cancel',
        },
        callbackUrls: {
            success: 'https://rekkari.test:3001/api/pay/payment-thanks',
            cancel: 'https://rekkari.test:3001/api/pay/payment-cancel',
        }
    };
    const checkoutResponse = await client.createPayment(payment);
    return response.json(checkoutResponse.providers);
}

// Work in progress
function thanks(request, response) {
    console.log(response);
    return response.send('Thanks for your purchase!');
}

// Work in progress
function cancel(request, response) {
    console.log(response);
    return response.send('Your payment has been cancelled.');
}

module.exports = {
    pay: pay,
    thanks: thanks,
    cancel: cancel,
};
