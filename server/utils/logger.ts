import log4js from 'log4js'
import path from 'node:path'
import fs from 'node:fs'
import config from '../../config/config.js'

const logPath = config.logPath
const appLog = path.join(logPath, 'app.log')
const accessLog = path.join(logPath, 'access.log')

function loggerInit() {
  try {
    fs.mkdirSync(logPath)
  } catch (e) {
    if (e.code != 'EEXIST') {
      console.error('Could not set up log directory, error was: ', e)
    }
  }

  const prodLogConfig = {
    appenders: {
      access: {
        type: 'dateFile',
        filename: accessLog,
        pattern: '-yyyy-MM-dd',
        category: 'http',
      },
      app: {
        type: 'file',
        filename: appLog,
        maxLogSize: 10485760,
        numBackups: 3,
      },
      errors: {
        type: 'logLevelFilter',
        level: 'ERROR',
        appender: 'email',
      },
      email: {
        type: '@log4js-node/smtp',
        sender: config.mailSender,
        recipients: config.adminMailAddress,
        subject: 'Jäsenrekisteri error',
        transport: {
          plugin: 'smtp',
          options: {
            host: config.smtpUrl,
            port: config.smtpPort,
          },
        },
      },
    },
    categories: {
      default: { appenders: ['app', 'errors'], level: 'DEBUG' },
      http: { appenders: ['access'], level: 'DEBUG' },
    },
    pm2: true,
  }

  const devLogConfig = {
    appenders: { out: { type: 'stdout' } },
    categories: { default: { appenders: ['out'], level: 'DEBUG' } },
    pm2: true,
  }

  let logConfig
  if (config.env === 'production') {
    logConfig = prodLogConfig
  } else {
    logConfig = devLogConfig
  }

  log4js.configure(logConfig)
}

const log = log4js.getLogger()
const logAccess = log4js.getLogger('http')

export { loggerInit, log, logAccess }

export default {
  loggerInit,
  log,
  logAccess,
}
