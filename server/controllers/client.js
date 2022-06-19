'use strict'

function index(request, response) {
  response.json('Asteriski jäsenrekisteri API')
}

module.exports = {
  index: index,
}
