'use strict';

const config = require('./config');
const nodemailer = require('nodemailer');

const boardMailAddress = config.boardMailAddress;
const mailSender = config.mailSender;
const useGmail = config.useGmail;
let transporter;

if (useGmail) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.gmailUser,
            pass: config.gmailPassword,
        },
    });
} else {
    transporter = nodemailer.createTransport({
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail',
    });
}

module.exports = { boardMailAddress, mailSender, transporter };
