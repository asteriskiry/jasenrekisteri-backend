'use strict'

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const log4js = require('log4js')
const mongoose = require('mongoose')
const passport = require('passport')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const cronJobs = require('./utils/cron')
const logger = require('./utils/logger')
const { Provider } = require('oidc-provider')

const Account = require('../config/oidc/account')
const oidcConfig = require('../config/oidc/config')
const adapter = require('../config/oidc/adapter')

module.exports = function() {
  let server = express()
  let create
  let start

  create = async function(config) {
    let routes = require('./routes')
    cronJobs.startCronJobs()
    logger.loggerInit()

    server.set('env', config.env)
    server.set('port', config.port)
    server.set('hostname', config.host)

    // OIDC
    oidcConfig.findAccount = Account.findAccount
    server.set('views', path.join(__dirname, 'views'))
    server.set('view engine', 'ejs')
    const provider = new Provider(config.url, { adapter, ...oidcConfig })

    server.use(log4js.connectLogger(logger.logAccess, { level: 'auto' }))

    server.use(cors())
    server.use(bodyParser.json())
    server.use(bodyParser.urlencoded({ extended: false }))
    server.use(cookieParser())
    server.use(passport.initialize())
    mongoose.connect(config.mongoUrl, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    })
    require('../config/passport')(passport)

    if (config.env === 'production') {
      server.use(express.static(config.staticFiles))
    }

    routes.init(server, provider)
  }

  start = function() {
    let hostname = server.get('hostname')
    let port = server.get('port')

    server.listen(port, function() {
      console.log('Jäsenrekisteri backend listening on http://' + hostname + ':' + port)
    })
  }

  return {
    create: create,
    start: start,
  }
}
