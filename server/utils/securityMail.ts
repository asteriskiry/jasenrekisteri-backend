import * as mail from '../../config/mail.js'

const pending = new Set<Promise<unknown>>()

// SMTP latency and delivery failures must not disclose whether an account exists.
export function afterResponse(response, work: () => Promise<unknown>) {
  response.once('finish', () => {
    const task = Promise.resolve()
      .then(work)
      .catch(() => console.error('[SECURITY_MAIL] Request processing or delivery failed.'))
      .finally(() => pending.delete(task))
    pending.add(task)
  })
}

export async function waitForSecurityMail() {
  while (pending.size) await Promise.all(pending)
}

export function sendSecurityMail(to: string, subject: string, text: string) {
  return mail.sendMailWithLogging({ from: mail.mailSender, to, subject, text }, 'security-mail')
}
