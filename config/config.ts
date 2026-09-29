'use strict'

import 'dotenv/config'

const mongoUrl = process.env.MONGOURL || 'mongodb://127.0.0.1/jasenrekisteri'
const host = process.env.HOST || 'localhost'
const port = process.env.PORT || 3001
const secret = process.env.SECRET
const env = process.env.ENV || 'local'
const clientUrl = process.env.CLIENTURL || 'http://localhost:3000'
const CSVFilePath = process.env.CSVFILEPATH || '/tmp/kulkuoikeudet_asteriski.csv'
const importMode = process.env.IMPORT_MODE || '0'
const logPath = process.env.LOGPATH || '/var/log/jasenrekisteri'
// Email Stuff
const adminMailAddress = process.env.ADMINMAILADDRESS || 'palvelinvastaava@asteriski.fi'
const boardMailAddress = process.env.BOARDMAILADDRESS || 'asteriski@utu.fi'
const mailSender = process.env.MAILSENDER || 'asteriski@utu.fi'
const smtpUrl = process.env.SMTPURL || 'smtp.utu.fi'
const smtpPort = process.env.SMTPPORT || 25
// Gmail stuff for testing purposes only
const useGmail = process.env.USEGMAIL || false
const gmailUser = process.env.GMAILUSER
const gmailPassword = process.env.GMAILPASSWORD
const sendgridApiKey = process.env.SENDGRID_API_KEY
const trustProxy = process.env.TRUST_PROXY === '1' ? 1 : false

export function validateConfig() {
  if (!secret || secret.length < 32) throw new Error('SECRET must contain at least 32 characters.')
  const url = new URL(clientUrl)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('CLIENTURL must be an HTTP(S) URL.')
  if (env === 'production' && url.protocol !== 'https:') throw new Error('Production CLIENTURL must use HTTPS.')
  if (!!process.env.STRIPE_SECRET_KEY !== !!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Set both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, or leave both unset.')
  }
}

export default {
  mongoUrl,
  host,
  port,
  secret,
  env,
  clientUrl,
  CSVFilePath,
  logPath,
  importMode,
  adminMailAddress,
  boardMailAddress,
  mailSender,
  smtpUrl,
  smtpPort,
  useGmail,
  gmailUser,
  gmailPassword,
  sendgridApiKey,
  trustProxy,
}
