import serverFactory from './server/index.js'
import config from './config/config.js'

const server = serverFactory()

server.create(config)
server.start()
