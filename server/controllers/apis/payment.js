'use strict';

const express = require('express');
const paymentService = require('../../services/payment/payment');

let router = express.Router();

router.post('/', paymentService.pay);
router.post('/payment-thanks', paymentService.thanks);
router.post('/payment-cancel', paymentService.cancel);

module.exports = router;
