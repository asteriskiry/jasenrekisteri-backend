'use strict';

const passport = require('passport');
const express = require('express');

const detailsService = require('../../services/member/details');

let router = express.Router();

router.get(
    '/details',
    passport.authenticate('jwt', { session: false }),
    detailsService.fetchDetails
);
router.put(
    '/details',
    passport.authenticate('jwt', { session: false }),
    detailsService.updateDetails
);

module.exports = router;
