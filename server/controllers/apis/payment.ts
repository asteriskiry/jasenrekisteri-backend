'use strict'

import express from 'express'
import paymentService from '../../services/payment/payment.js'

let router = express.Router()

router.post('/', paymentService.createPayment)
router.post('/payment-return', paymentService.paymentReturn)

export default router
