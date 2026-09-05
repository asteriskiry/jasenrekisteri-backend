'use strict'

import passport from 'passport'
import express from 'express'
import paymentService from '../../services/payment/payment.js'

let router = express.Router()

router.post('/', passport.authenticate('jwt', { session: false }), paymentService.createPayment)
router.post('/webhook', paymentService.stripeWebhook)
router.get('/session-status', paymentService.getPaymentStatus)

export default router
