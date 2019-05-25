'use strict';

const config = require('./config');
const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.gmailUser,
        pass: config.gmailPassword,
    },
});

module.exports = { transporter };
