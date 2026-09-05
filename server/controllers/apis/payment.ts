'use strict'

import passport from 'passport'
import express from 'express'
import paymentService from '../../services/payment/payment.js'
import rateLimiter from '../../utils/rateLimiter.js'

let router = express.Router()

// Unauthenticated and proxies to the Stripe API, so rate-limit it.
const sessionStatusLimiter = rateLimiter({ windowMs: 60 * 1000, max: 20 })

router.post('/', passport.authenticate('jwt', { session: false }), paymentService.createPayment)
router.post('/webhook', paymentService.stripeWebhook)
router.get('/session-status', sessionStatusLimiter, paymentService.getPaymentStatus)

export default router
