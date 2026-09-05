'use strict'

import express from 'express'
import resetService from '../../services/authentication/reset.js'

let router = express.Router()

router.post('/', resetService.resetPassword)

export default router
