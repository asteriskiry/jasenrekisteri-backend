'use strict';

const config = require('./config');
const nodemailer = require('nodemailer');

const boardMailAddress = config.boardMailAddress;
const mailSender = config.mailSender;
const useGmail = config.useGmail;

const gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.gmailUser,
        pass: config.gmailPassword,
    },
});

const sendmailTransporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail',
});

const transporter = useGmail === '1' ? gmailTransporter : sendmailTransporter;

module.exports = { boardMailAddress, mailSender, transporter };
