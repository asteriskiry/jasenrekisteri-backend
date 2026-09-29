'use strict'

import express from 'express'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import log4js from 'log4js'
import mongoose from 'mongoose'
import passport from 'passport'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import cronJobs from './utils/cron.js'
import logger from './utils/logger.js'
import routes from './routes/index.js'
import configurePassport from '../config/passport.js'
import { errorHandler } from './utils/errors.js'
import { validateConfig } from '../config/config.js'

export default function () {
  let server = express()
  let create
  let start

  create = async function (config) {
    validateConfig()
    logger.loggerInit()

    server.set('env', config.env)
    server.set('port', config.port)
    server.set('hostname', config.host)
    server.set('trust proxy', config.trustProxy)

    server.use(
      log4js.connectLogger(logger.logAccess, {
        level: 'auto',
        // Route patterns exclude payment stamps and password-reset tokens.
        format: (request, response) => `${request.method} ${request.route?.path || 'unmatched'} ${response.statusCode}`,
      })
    )

    server.use(cors({ origin: config.clientUrl, credentials: true }))
    server.get('/health', (request, response) => {
      response
        .status(mongoose.connection.readyState === 1 ? 200 : 503)
        .json({ ready: mongoose.connection.readyState === 1 })
    })
    server.use('/api/pay/webhook', express.raw({ type: 'application/json' }))
    server.use(express.json())
    server.use(express.urlencoded({ extended: false }))
    server.use(cookieParser())
    server.use(passport.initialize())
    await mongoose.connect(config.mongoUrl, { serverSelectionTimeoutMS: 10000 })
    const hello = await mongoose.connection.db.admin().command({ hello: 1 })
    if (!hello.setName && hello.msg !== 'isdbgrid')
      throw new Error(
        'Administrative audit logging and payment fulfillment require a MongoDB replica set or sharded cluster.'
      )
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()))
    cronJobs.startCronJobs()
    configurePassport(passport)

    if (config.env === 'local' || config.env === 'development') {
      const swaggerDocument = JSON.parse(readFileSync(join(process.cwd(), 'swagger.json'), 'utf8'))
      server.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
    }

    routes.init(server)
    server.use(errorHandler)
  }

  start = function () {
    let hostname = server.get('hostname')
    let port = server.get('port')

    return server.listen(port, hostname, function (err) {
      if (err) console.log('Error in server setup')
      console.log('Jäsenrekisteri backend listening on http://' + hostname + ':' + port)
    })
  }

  return {
    create: create,
    start: start,
  }
}
