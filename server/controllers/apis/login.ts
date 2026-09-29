'use strict'

import express from 'express'
import loginService from '../../services/authentication/login.js'
import { authLimit, emailKey } from '../../utils/authLimits.js'

let router = express.Router()

router.post(
  '/',
  authLimit('login-ip', 50, 15 * 60_000),
  authLimit('login-account', 10, 15 * 60_000, emailKey),
  loginService.loginUser
)

export default router
