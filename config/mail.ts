'use strict'

import config from './config.js'
import nodemailer from 'nodemailer'
import fs from 'node:fs'
import path from 'node:path'

const boardMailAddress = config.boardMailAddress
const mailSender = config.mailSender
const emailLogPath = path.join(config.logPath, 'emails.log')
const messagesLogPath = path.join(config.logPath, 'emails-messages.log')

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS

const smtpTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  connectionTimeout: 10000,
  socketTimeout: 30000,
  auth: smtpUser
    ? {
        user: smtpUser,
        pass: smtpPass,
      }
    : undefined,
})

const transporter = smtpTransporter

function callback(error, info) {
  let logEntry
  if (error) {
    logEntry = 'Error: Date: ' + new Date() + ', ' + 'Info: ' + JSON.stringify(error) + '\n'
  } else {
    logEntry = 'Success: Date: ' + new Date() + ', ' + 'Info: ' + JSON.stringify(info) + '\n'
  }
  appendLog(emailLogPath, logEntry)
}

function logMessage(data) {
  appendLog(messagesLogPath, JSON.stringify({ time: new Date(), to: data.to, subject: data.subject }) + '\n')
}

function appendLog(file, entry) {
  try {
    fs.mkdirSync(config.logPath, { recursive: true })
    fs.appendFileSync(file, entry)
  } catch {
    console.error('Could not write mail delivery log.')
  }
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
