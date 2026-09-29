'use strict'

import passport from 'passport'
import express from 'express'

import detailsService from '../../services/member/details.js'
import validService from '../../services/member/valid.js'
import { confirmEmail } from '../../services/member/email.js'
import { authLimit, memberKey } from '../../utils/authLimits.js'

let router = express.Router()

router.get('/details', passport.authenticate('jwt', { session: false }), detailsService.fetchDetails)
router.put(
  '/details',
  passport.authenticate('jwt', { session: false }),
  authLimit('profile-update', 20, 15 * 60_000, memberKey),
  detailsService.updateDetails
)
router.post(
  '/email/confirm',
  passport.authenticate('jwt', { session: false }),
  authLimit('email-confirm', 10, 15 * 60_000, memberKey),
  confirmEmail
)
router.get('/valid', passport.authenticate('jwt', { session: false }), validService.isMembershipValid)

export default router
