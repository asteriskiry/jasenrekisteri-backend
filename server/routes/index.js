'use strict'

const apiRoute = require('./apis')
const clientRoute = require('./client')
const oidcRoute = require('./oidc')

function init(server) {
  server.use('/api', apiRoute)
  server.use('/oidc', oidcRoute)
  server.use('/', clientRoute)
}

module.exports = {
  init: init,
}
