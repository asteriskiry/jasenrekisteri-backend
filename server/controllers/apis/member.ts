'use strict'

import passport from 'passport'
import express from 'express'

import detailsService from '../../services/member/details.js'
import validService from '../../services/member/valid.js'

let router = express.Router()

router.get('/details', passport.authenticate('jwt', { session: false }), detailsService.fetchDetails)
router.put('/details', passport.authenticate('jwt', { session: false }), detailsService.updateDetails)
router.get('/valid', passport.authenticate('jwt', { session: false }), validService.isMembershipValid)

export default router
