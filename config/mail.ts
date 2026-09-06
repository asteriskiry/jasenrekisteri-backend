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

// Keep the SendGrid transport as a rollback option while moving to SMTP/Brevo.
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

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS

// Rollback-friendly legacy config
// let options = {
//   auth: {
//     api_key: config.sendgridApiKey,
//   },
// }
// const sendgridTransporter = nodemailer.createTransport(sgTransport(options))

const smtpTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
})

const transporter = smtpTransporter

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

function sendMailWithLogging(options, label = 'mail') {
  return new Promise((resolve, reject) => {
    transporter.sendMail(options, (error, info) => {
      const event = {
        label,
        to: options && options.to,
        subject: options && options.subject,
      }

      if (error) {
        const errorPayload = {
          error: error.message || String(error),
          response: error.response || null,
          ...event,
        }
        console.error('[MAILER_ERROR]', JSON.stringify(errorPayload))
        callback(error, info)
        return reject(error)
      }

      console.log('[MAILER_SUCCESS]', JSON.stringify({ ...event, messageId: info && info.messageId }))
      callback(null, info)
      resolve(info)
    })
  })
}

export { boardMailAddress, mailSender, transporter, callback, logMessage, sendMailWithLogging }
