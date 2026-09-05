'use strict'

const express = require('express')
const paymentService = require('../../services/payment/payment')

let router = express.Router()

router.post('/', paymentService.createPayment)
router.post('/webhook', paymentService.stripeWebhook)
router.get('/session-status', paymentService.getPaymentStatus)

module.exports = router
