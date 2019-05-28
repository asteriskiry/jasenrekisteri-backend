'use strict';

const express = require('express');
const clientController = require('../controllers/client');

let router = express.Router();

router.get('/*', clientController.index);

module.exports = router;
