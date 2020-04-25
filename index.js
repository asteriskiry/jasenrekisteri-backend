'use strict'

const cronJobs = require('./server/utils/cron')
cronJobs.startCronJobs()

const server = require('./server')()
const config = require('./config/config.js')

server.create(config)
server.start()
