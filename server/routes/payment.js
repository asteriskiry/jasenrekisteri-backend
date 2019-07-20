'use strict';

const express = require('express');
const paymentController = require('../controllers/payment');

let router = express.Router();

router.use('/*', paymentController);

module.exports = router;
