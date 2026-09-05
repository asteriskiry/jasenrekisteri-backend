'use strict'

import passport from 'passport'
import express from 'express'

import newService from '../../services/admin/new.js'
import listService from '../../services/admin/list.js'
import removeService from '../../services/admin/remove.js'
import profileService from '../../services/admin/profile.js'

let router = express.Router()

router.get('/list', passport.authenticate('jwt', { session: false }), listService.list)
router.post('/new', passport.authenticate('jwt', { session: false }), newService.save)
router.post('/remove', passport.authenticate('jwt', { session: false }), removeService.remove)

router.get('/profile', passport.authenticate('jwt', { session: false }), profileService.get)
router.put('/update', passport.authenticate('jwt', { session: false }), profileService.update)

export default router
