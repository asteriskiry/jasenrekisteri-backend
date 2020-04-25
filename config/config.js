'use strict'

require('dotenv').config()

const mongoUrl = process.env.MONGOURL || 'mongodb://127.0.0.1/jasenrekisteri'
const host = process.env.HOST || 'localhost'
const port = process.env.PORT || 3001
const secret = process.env.SECRET
const staticFiles = process.env.STATICFILES
const env = process.env.ENV || 'local'
const clientUrl = process.env.CLIENTURL || 'http://localhost:3000'
const CSVFilePath = process.env.CSVFILEPATH || '/tmp/kulkuoikeudet_asteriski.csv'
const importMode = process.env.IMPORT_MODE || '0'
const logPath = process.env.LOGPATH || '/var/log/jasenrekisteri'
// Email Stuff
const adminMailAddress = process.env.ADMINMAILADDRESS || 'mjturt@utu.fi'
const boardMailAddress = process.env.BOARDMAILADDRESS || 'asteriski@utu.fi'
const mailSender = process.env.MAILSENDER || 'jasenrekisteri@asteriski.fi'
// Gmail stuff for testing purposes only
const useGmail = process.env.USEGMAIL || false
const gmailUser = process.env.GMAILUSER
const gmailPassword = process.env.GMAILPASSWORD

module.exports = {
  mongoUrl,
  host,
  port,
  secret,
  staticFiles,
  env,
  clientUrl,
  CSVFilePath,
  logPath,
  importMode,
  adminMailAddress,
  boardMailAddress,
  mailSender,
  useGmail,
  gmailUser,
  gmailPassword,
}
