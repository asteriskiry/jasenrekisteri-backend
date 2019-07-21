'use strict';

require('dotenv').config();

const CheckoutFinland = require('checkout-finland');
const uuidv1 = require('uuid/v1');

const client = new CheckoutFinland(
    process.env.MERCHANT_ID,
    process.env.MERCHANT_SECRET,
);

// Turha
function buy(request, response) {
    return response.send(
        '<form action="/api/payment/pay" method="post"><input type="submit" value="Buy a shoe!"></form>'
    );
}

// Main stuff happens here
async function pay(request, response) {
    const payment = {
        stamp: uuidv1(),
        reference: '3759170',
        amount: 1525,
        currency: 'EUR',
        language: 'FI',
        items: [
            {
                unitPrice: 1525,
                units: 1,
                vatPercentage: 24,
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
            success: 'https://ecom.example.com/cart/success',
            cancel: 'https://ecom.example.com/cart/cancel',
        },
    };
    const checkoutResponse = await client.createPayment(payment);
    console.log(checkoutResponse);
    return response.json(checkoutResponse);
}

function thanks(request, response) {
    response.send('Thanks for your purchase!');
}

function cancel(request, response) {
    return response.send('Your payment has been cancelled.');
}

module.exports = {
    buy: buy,
    pay: pay,
    thanks: thanks,
    cancel: cancel,
};
