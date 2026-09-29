import serverFactory from './server/index.js'
import config from './config/config.js'

const server = serverFactory()

await server.create(config)
const listener = server.start()

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    listener.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 10000).unref()
  })
}
