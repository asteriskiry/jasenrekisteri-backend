'use strict';

const config = require('./config');
const nodemailer = require('nodemailer');

const boardMailAddress = config.boardMailAddress;
const mailSender = config.mailSender;

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.gmailUser,
        pass: config.gmailPassword,
    },
});

module.exports = { boardMailAddress, mailSender, transporter };
