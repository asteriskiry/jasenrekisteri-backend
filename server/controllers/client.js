'use strict'

const path = require('path')
const config = require('../../config/config')

function index(request, response) {
  if (config.env === 'production') {
    response.sendFile(path.join(config.staticFiles, 'index.html'))
  } else {
    response.json('Asteriski jäsenrekisteri API')
  }
}

module.exports = {
  index: index,
}
