'use strict'

const passport = require('passport')
const express = require('express')
const paymentService = require('../../services/payment/payment')

let router = express.Router()

router.post('/', passport.authenticate('jwt', { session: false }), paymentService.createPayment)
router.post('/webhook', paymentService.stripeWebhook)
router.get('/session-status', paymentService.getPaymentStatus)

module.exports = router
