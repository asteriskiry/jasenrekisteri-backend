'use strict'

import express from 'express'
import forgotService from '../../services/authentication/forgot.js'

let router = express.Router()

router.post('/', forgotService.forgotPassword)

export default router
