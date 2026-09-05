'use strict'

function index(request, response) {
  response.json('Asteriski jäsenrekisteri API')
}

export default {
  index: index,
}
