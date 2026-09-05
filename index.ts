import serverFactory from './server/index.js'
import config from './config/config.js'
import 'dotenv/config'

const server = serverFactory()

server.create(config)
server.start()
