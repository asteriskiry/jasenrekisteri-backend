const log4js = require('log4js')
const path = require('path')
const config = require('../../config/config')

const logPath = config.logPath
const appLog = path.join(logPath, 'app.log')
const accessLog = path.join(logPath, 'access.log')

function loggerInit() {
  try {
    require('fs').mkdirSync(logPath)
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
        sendInterval: 3600,
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

module.exports = {
  loggerInit,
  log,
  logAccess,
}
