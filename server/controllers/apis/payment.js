'use strict'

const passport = require('passport')
const express = require('express')
const paymentService = require('../../services/payment/payment')
const rateLimiter = require('../../utils/rateLimiter')

let router = express.Router()

// Unauthenticated (a member isn't logged in yet on the payment return page),
// so rate-limit it: it proxies to the Stripe API and can return payment PII.
const sessionStatusLimiter = rateLimiter({ windowMs: 60 * 1000, max: 20 })

router.post('/', passport.authenticate('jwt', { session: false }), paymentService.createPayment)
router.post('/webhook', paymentService.stripeWebhook)
router.get('/session-status', sessionStatusLimiter, paymentService.getPaymentStatus)

module.exports = router
