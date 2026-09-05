'use strict'

import config from './config.js'
import nodemailer from 'nodemailer'
import fs from 'node:fs'
import path from 'node:path'

const boardMailAddress = config.boardMailAddress
const mailSender = config.mailSender
// const useGmail = config.useGmail
const emailLogPath = path.join(config.logPath, 'emails.log')
const messagesLogPath = path.join(config.logPath, 'emails-messages.log')
import sgTransport from 'nodemailer-sendgrid-transport'

/*
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.gmailUser,
    pass: config.gmailPassword,
  },
})

const sendmailTransporter = nodemailer.createTransport({
  host: config.smtpUrl,
  port: config.smtpPort,
})
  */

let options = {
  auth: {
    api_key: config.sendgridApiKey,
  },
}

const sendgridTransporter = nodemailer.createTransport(sgTransport(options))

// const transporter = useGmail === '1' ? gmailTransporter : sendmailTransporter
const transporter = sendgridTransporter

function callback(error, info) {
  let logEntry
  if (error) {
    logEntry = 'Error: Date: ' + new Date() + ', ' + 'Info: ' + JSON.stringify(error) + '\n'
  } else {
    logEntry = 'Success: Date: ' + new Date() + ', ' + 'Info: ' + JSON.stringify(info) + '\n'
  }
  fs.appendFileSync(emailLogPath, logEntry)
}

function logMessage(data) {
  let logEntry = 'Tried send message at ' + new Date() + ' with data: ' + JSON.stringify(data) + '\n'
  fs.appendFileSync(messagesLogPath, logEntry)
}

export { boardMailAddress, mailSender, transporter, callback, logMessage }
