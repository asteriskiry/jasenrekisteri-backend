'use strict'

import apiRoute from './apis/index.js'
import clientRoute from './client.js'

function init(server) {
  server.use('/api', apiRoute)
  server.use('/', clientRoute)
}

export default {
  init: init,
}
