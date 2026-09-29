import mongoose from 'mongoose'
import config from '../config/config.js'
import service, { stripe } from '../server/services/payment/payment.js'

const sessionId = process.argv[2]
if (!stripe || !sessionId?.startsWith('cs_'))
  throw new Error('Usage: npm run reconcile-payment -- cs_... (requires Stripe credentials)')
try {
  await mongoose.connect(config.mongoUrl)
  await service.fulfillSession(await stripe.checkout.sessions.retrieve(sessionId))
  console.log('Reconciliation finished. Inspect the local Payment record for fulfillment or manual review status.')
} finally {
  await mongoose.disconnect()
}
