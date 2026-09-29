import serverFactory from './server/index.js'
import config from './config/config.js'
import { waitForSecurityMail } from './server/utils/securityMail.js'

const server = serverFactory()

await server.create(config)
const listener = server.start()

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    listener.close(async () => {
      await waitForSecurityMail()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10000).unref()
  })
}
