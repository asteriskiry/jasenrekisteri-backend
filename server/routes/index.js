'use strict';

const apiRoute = require('./apis');
const clientRoute = require('./client');
const paymentRoute = require('./payment');

function init(server) {
    server.use('/api', apiRoute);
    server.use('/payment', paymentRoute);
    server.use('/', clientRoute);
}

module.exports = {
    init: init,
};
