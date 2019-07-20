'use strict';

const express = require('express');
const paymentService = require('../services/payment/payment');

let router = express.Router();

// router.get('/', paymentService.buy);
router.post('/', paymentService.pay);
router.post('/payment-return', paymentService.thanks);
router.post('/payment-cancel', paymentService.cancel);

module.exports = router;
