'use strict'

const passport = require('passport')
const express = require('express')

const detailsService = require('../../services/member/details')
const validService = require('../../services/member/valid')

let router = express.Router()


router.get('/details', passport.authenticate('jwt', { session: false }), detailsService.fetchDetails)
router.put('/details', passport.authenticate('jwt', { session: false }), detailsService.updateDetails)
router.get('/valid', passport.authenticate('jwt', { session: false }), validService.isMembershipValid)

module.exports = router
