'use strict'

import express from 'express'
import forgotService from '../../services/authentication/forgot.js'
import { authLimit, emailKey, recoveryAccepted } from '../../utils/authLimits.js'

let router = express.Router()

router.post(
  '/',
  authLimit('forgot-ip', 20, 15 * 60_000),
  authLimit('forgot-account', 1, 5 * 60_000, emailKey, recoveryAccepted),
  forgotService.forgotPassword
)

export default router
