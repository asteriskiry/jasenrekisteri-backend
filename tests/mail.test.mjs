import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import nodemailer from 'nodemailer'

test('patched Nodemailer sends application mail and remains compatible with the SMTP log appender', async () => {
  const require = createRequire(import.meta.url)
  const adapterRequire = createRequire(require.resolve('@log4js-node/smtp'))
  assert.equal(adapterRequire.resolve('nodemailer'), require.resolve('nodemailer'))
  const messages = []
  // Nodemailer 10 has separate ESM and CJS exports; exercise both actual implementations.
  const stubs = [nodemailer, require('nodemailer')].map((mailer) => {
    const createTransport = mailer.createTransport.bind(mailer)
    return mock.method(mailer, 'createTransport', () => {
      const transport = createTransport({ streamTransport: true, buffer: true, newline: 'unix' })
      const send = transport.sendMail.bind(transport)
      transport.sendMail = (message, callback) =>
        send(message, (error, info) => {
          if (!error) messages.push(info.message.toString())
          callback(error, info)
        })
      return transport
    })
  })
  try {
    process.env.LOGPATH = './logs/mail-tests'
    const mail = await import('../dist/config/mail.js')
    await mail.sendMailWithLogging({
      from: 'register@example.test',
      to: 'member@example.test',
      subject: 'Confirmation',
      text: 'Confirmation link fixture',
    })
    const appender = require('@log4js-node/smtp').configure(
      {
        sender: 'register@example.test',
        recipients: 'admin@example.test',
        subject: 'API error',
        transport: { options: { streamTransport: true } },
      },
      { basicLayout: (event) => event.data.join(' '), messagePassThroughLayout: (event) => event.data.join(' ') }
    )
    appender({ data: ['Error log fixture'] })
    await new Promise((resolve) => appender.shutdown(resolve))
    assert.equal(messages.length, 2)
    assert.match(messages[0], /To: member@example.test/)
    assert.match(messages[0], /Confirmation link fixture/)
    assert.match(messages[1], /To: admin@example.test/)
    assert.match(messages[1], /Error log fixture/)
  } finally {
    stubs.forEach((stub) => stub.mock.restore())
  }
})
