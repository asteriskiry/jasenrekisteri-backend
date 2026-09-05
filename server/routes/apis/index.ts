'use strict'

import express from 'express'
let router = express.Router()

import registerController from '../../controllers/apis/register.js'
import loginController from '../../controllers/apis/login.js'
import forgotController from '../../controllers/apis/forgot.js'
import resetController from '../../controllers/apis/reset.js'

import adminController from '../../controllers/apis/admin.js'
import memberController from '../../controllers/apis/member.js'
import paymentController from '../../controllers/apis/payment.js'

router.use('/register', registerController)
router.use('/login', loginController)
router.use('/forgot', forgotController)
router.use('/reset', resetController)

router.use('/admin', adminController)

router.use('/member', memberController)
router.use('/pay', paymentController)

export default router
