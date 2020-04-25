'use strict'

const express = require('express')
const resetService = require('../../services/authentication/reset')

let router = express.Router()

router.post('/', resetService.resetPassword)

module.exports = router
