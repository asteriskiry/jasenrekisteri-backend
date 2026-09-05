'use strict'

import express from 'express'
import registerService from '../../services/authentication/register.js'

let router = express.Router()

router.post('/', registerService.registerUser)

export default router
