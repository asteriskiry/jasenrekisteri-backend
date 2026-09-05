'use strict'

require('dotenv').config()

const server = require('./server')()
const config = require('./config/config.js')

server.create(config)
server.start()
