'use strict'

import express from 'express'
import paymentService from '../../services/payment/payment.js'
import rateLimiter from '../../utils/rateLimiter.js'
import { authenticatePayment } from '../../services/payment/auth.js'

let router = express.Router()

const sessionStatusLimiter = rateLimiter({ windowMs: 60 * 1000, max: 20 })
const checkoutLimiter = rateLimiter({ windowMs: 60 * 1000, max: 10 })

router.post('/', checkoutLimiter, authenticatePayment, paymentService.createPayment)
router.post('/webhook', paymentService.stripeWebhook)
router.get('/session-status', sessionStatusLimiter, paymentService.getPaymentStatus)

export default router
