'use strict';

require('dotenv').config();

const CheckoutFinland = require('checkout-finland');
const uuidv1 = require('uuid/v1');
const moment = require('moment');
const httpResponses = require('./');
const cryptoRandomString = require('crypto-random-string');

const Member = require('../../models/Member');
const Payment = require('../../models/Payment');
const Product = require('../../models/Product');

// Work in progress

// Initialize Checkout API
const client = new CheckoutFinland(process.env.MERCHANT_ID, process.env.MERCHANT_SECRET);

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
            const stamp = cryptoRandomString({ length: 30 });

            // Generate order reference
            const reference = uuidv1();

            // Create payment record
            let newPayment = new Payment();
            newPayment.memberId = memberObj._id;
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
            newPayment.processed = false;

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
                            deliveryDate: moment(productObj.timestamp).format('YYYY-MM-DD'),
                            merchant: process.env.MERCHANT_ID,
                            reference: reference,
                            description: productObj.name,
                            category: productObj.category,
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
    const account = request.body.account;
    const algorithm = request.body.algorithm;
    const amount = request.body.amount;
    const stamp = request.body.stamp;
    const reference = request.body.reference;
    const transactionId = request.body.transactionId;
    const status = request.body.status;
    const provider = request.body.provider;
    const signature = request.body.signature;

    // Validations

    // Check if all needed parameters are provided
    if (
        !account ||
        !algorithm ||
        !amount ||
        !stamp ||
        !reference ||
        !transactionId ||
        !status ||
        !provider ||
        !signature
    ) {
        return response.json(httpResponses.onPaymentError);
    }

    // Validate signature
    const sigValidationData = {
        'checkout-account': account,
        'checkout-algorithm': algorithm,
        'checkout-amount': amount,
        'checkout-stamp': stamp,
        'checkout-reference': reference,
        'checkout-transaction-id': transactionId,
        'checkout-status': status,
        'checkout-provider': provider,
    };
    const calculatedSignature = client.calculateHmac(sigValidationData, '');

    if (calculatedSignature !== signature) {
        return response.json(httpResponses.onPaymentError);
    }

    // Success / Cancel handling

    // Success
    if (status === 'ok') {
        // Find payment by stamp and update record
        const paymentFilter = { stamp: stamp, processed: false };
        const paymentUpdate = { status: 'Success', processed: true };

        Payment.findOneAndUpdate(paymentFilter, paymentUpdate, { new: true }, (error, payment) => {
            if (error) return response.json(httpResponses.onPaymentError);
            if (!payment) return response.json(httpResponses.onPaymentNotFoundOrAlredyProcessed);
            const memberId = payment.memberId;
            const memberFilter = { _id: memberId };
            Member.findOne(memberFilter, (error, member) => {
                if (error || !member) return response.json(httpResponses.onPaymentError);
                const currentEndDate = member.membershipEnds;
                let memberUpdate = null;
                if (payment.productId === '1111') {
                    memberUpdate = {
                        membershipEnds: moment(currentEndDate)
                            .add(1, 'y')
                            .toDate(),
                    };
                } else if (payment.productId === '1555') {
                    memberUpdate = {
                        membershipEnds: moment(currentEndDate)
                            .add(5, 'y')
                            .toDate(),
                    };
                } else {
                    return response.json(httpResponses.onPaymentError);
                }
                Member.findOneAndUpdate(memberFilter, memberUpdate, { new: true }, (error, updatedMember) => {
                    if (error || !updatedMember) return response.json(httpResponses.onPaymentError);
                    const responseBody = {
                        success: true,
                        message: 'Maksun käsittely onnistui.',
                        paymentData: {
                            firstName: updatedMember.firstName,
                            lastName: updatedMember.lastName,
                            email: updatedMember.email,
                            membershipEnds: updatedMember.membershipEnds,
                            amount: payment.amountSnt,
                            timestamp: payment.timestamp,
                            product: payment.productName,
                        },
                    };
                    return response.json(responseBody);
                });
            });
        });

        // Cancel
    } else if (status === 'fail') {
        return response.json(httpResponses.onPaymentCancel);

        // Something else
    } else {
        return response.json(httpResponses.onPaymentError);
    }
}

module.exports = {
    createPayment: createPayment,
    paymentSuccess: paymentSuccess,
};
