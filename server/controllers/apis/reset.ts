'use strict'

import express from 'express'
import resetService from '../../services/authentication/reset.js'
import { authLimit, memberKey } from '../../utils/authLimits.js'

let router = express.Router()

router.post(
  '/',
  authLimit('reset-ip', 50, 15 * 60_000),
  authLimit('reset-account', 20, 15 * 60_000, memberKey),
  resetService.resetPassword
)

export default router
