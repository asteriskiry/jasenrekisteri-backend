'use strict';

require('dotenv').config();

var CheckoutApi = require('checkout-api');

var checkout = new CheckoutApi({
    merchantId: process.env.MERCHANT_ID,
    merchantSecret: process.env.MERCHANT_SECRET,
    baseUrl: process.env.BASE_URL,
});

function buy(request, response) {
    return response.send(
        '<form action="/api/payment/pay" method="post"><input type="submit" value="Buy a shoe!"></form>'
    );
}

function pay(request, response) {
    var html = '<h1>Select payment method</h1>';

    checkout
        .preparePayment({
            AMOUNT: 1000,
            STAMP: Math.round(Math.random() * 100000), // this is just to keep the example simple
            // you actually need to generate a unique stamp and store it in the database
            REFERENCE: '12345',
        })
        .then(apiResponse => {
            var banks = apiResponse.trade.payments.payment.banks;

            // render html from the response
            for (var bankName in banks) {
                var hiddenFields = '';
                var bank = banks[bankName];

                for (var key in bank) {
                    var value = bank[key];
                    if (value === {}) {
                        value = '';
                    }
                    hiddenFields += `<input type="hidden" name="${key}" value="${value}" />`;
                }

                html += `<form action="${bank.url}" method="post">
            ${hiddenFields}
            <input type="image" src="${bank.icon}" />
            <span>${bank.name}</span>
          </form>`;
            }

            return response.json(banks);
        });
}

function thanks(request, response) {
    var status = parseInt(request.query.STATUS, 10);
    if (
        checkout.validateReturnMsg(request.query) &&
        (status === 2 || status >= 5)
    ) {
        response.send('Thanks for your purchase!');
    } else {
        response.send('Unfortunately something went wrong.');
    }
}

function cancel(request, response) {
    if (checkout.validateReturnMsg(request.query)) {
        return response.send('Your payment has been cancelled.');
    } else {
        return response.send('Unfortunately something went wrong.');
    }
}

module.exports = {
    buy: buy,
    pay: pay,
    thanks: thanks,
    cancel: cancel,
};
