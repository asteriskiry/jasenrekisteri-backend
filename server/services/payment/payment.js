'use strict';

require('dotenv').config();

const CheckoutFinland = require('checkout-finland');
const uuidv1 = require('uuid/v1');
const moment = require('moment');
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

    // Find the member whose payment it is
    Member.findOne({ _id: memberId }, (error, member) => {
        if (error || !member) return response.json(httpResponses.onError);
        const memberObj = member.toObject();

        // Find product
        Product.findOne({ productId: productId }, (error, product) => {
            if (error || !product) return response.json(httpResponses.onError);
            const productObj = product.toObject();

            // Generate stamp (this is how payment is identified)
            const stamp = uuidv1();

            // Generate order reference
            const reference = uuidv1();

            // Create payment record
            let newPayment = new Payment();
            newPayment.firstName = memberObj.firstName;
            newPayment.lastName = memberObj.lastName;
            newPayment.email = memberObj.email;
            newPayment.hometown = memberObj.hometown;
            newPayment.timestamp = new Date();
            newPayment.productId = productObj.productId;
            newPayment.productName = productObj.name;
            newPayment.amountSnt = productObj.priceSnt;
            newPayment.stamp = stamp;
            newPayment.status = 'Pending';
            newPayment.reference = reference;

            // Save new payment record
            newPayment.save(async function(error) {
                if (error) return response.json(httpResponses.onError);

                // Payment request data
                const payment = {
                    stamp: stamp,
                    reference: reference,
                    amount: productObj.priceSnt,
                    currency: 'EUR',
                    language: 'FI',
                    items: [
                        {
                            unitPrice: productObj.priceSnt,
                            units: 1,
                            vatPercentage: 0,
                            productCode: productObj.productId,
                            deliveryDate: moment(productObj.timestamp).format(
                                'YYYY-MM-DD'
                            ),
                            merchant: process.env.MERCHANT_ID,
                            reference: reference,
                            description: productObj.name,
                            category: productObj.category
                        },
                    ],
                    customer: {
                        email: memberObj.email,
                        firstName: memberObj.firstName,
                        lastName: memberObj.lastName,
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
            });
        });
    });
}

// When payment is made frontend calls this endpoint
function paymentSuccess(request, response) {
    console.log(request.body);
    return response.json(httpResponses.onPaymentSuccess);
}

module.exports = {
    createPayment: createPayment,
    paymentSuccess: paymentSuccess,
};
