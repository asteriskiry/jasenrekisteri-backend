'use strict'

import express from 'express'
import registerService from '../../services/authentication/register.js'
import { validateRegistrationRequest } from '../../services/authentication/register.js'
import { authLimit, emailKey } from '../../utils/authLimits.js'

let router = express.Router()

router.post(
  '/',
  authLimit('register-ip', 20, 15 * 60_000),
  validateRegistrationRequest,
  authLimit('register-account', 10, 15 * 60_000, emailKey),
  registerService.registerUser
)

export default router
