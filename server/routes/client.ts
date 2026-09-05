'use strict'

import express from 'express'
import clientController from '../controllers/client.js'

let router = express.Router()

router.get('/*splat', clientController.index)

export default router
