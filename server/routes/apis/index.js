'use strict';

const express = require('express');
let router = express.Router();

const registerController = require('../../controllers/apis/register');
const loginController = require('../../controllers/apis/login');
const forgotController = require('../../controllers/apis/forgot');
const resetController = require('../../controllers/apis/reset');

const adminController = require('../../controllers/apis/admin');
const memberController = require('../../controllers/apis/member');
const paymentController = require('../../controllers/apis/payment');

router.use('/register', registerController);
router.use('/login', loginController);
router.use('/forgot', forgotController);
router.use('/reset', resetController);

router.use('/admin', adminController);

router.use('/member', memberController);
router.use('/pay', paymentController);

module.exports = router;
