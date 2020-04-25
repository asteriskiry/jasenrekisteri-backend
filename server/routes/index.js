'use strict'

const apiRoute = require('./apis')
const clientRoute = require('./client')

function init(server) {
  server.use('/api', apiRoute)
  server.use('/', clientRoute)
}

module.exports = {
  init: init,
}
