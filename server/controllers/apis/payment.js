'use strict';

const express = require('express');
const paymentService = require('../../services/payment/payment');

let router = express.Router();

router.post('/', paymentService.createPayment);
router.post('/payment-return', paymentService.paymentReturn);

module.exports = router;
