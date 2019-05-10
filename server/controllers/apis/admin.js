'use strict';

const passport = require('passport');
const express = require('express');

const newService = require('../../services/admin/new');
const listService = require('../../services/admin/list');
const removeService = require('../../services/admin/remove');
const profileService = require('../../services/admin/profile');

let router = express.Router();

router.get('/list', passport.authenticate('jwt', { session: false }), listService.list);
router.post('/new', passport.authenticate('jwt', { session: false }), newService.save);
router.post('/remove', passport.authenticate('jwt', { session: false }), removeService.remove);

router.get('/profile', passport.authenticate('jwt', { session: false }), profileService.get);
router.put('/update', passport.authenticate('jwt', { session: false }), profileService.update);

module.exports = router;
