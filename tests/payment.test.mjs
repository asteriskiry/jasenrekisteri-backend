import { test, before, after, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import express from 'express'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

process.env.SECRET = 'isolated-test-secret-with-at-least-32-characters'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_isolated_tests_only'
const { default: Member } = await import('../dist/server/models/Member.js')
const { default: TempMember } = await import('../dist/server/models/TempMember.js')
const { default: Payment } = await import('../dist/server/models/Payment.js')
const { default: Product } = await import('../dist/server/models/Product.js')
const { createPaymentService, computeMembershipEndDate } = await import('../dist/server/services/payment/payment.js')
const { authenticatePayment } = await import('../dist/server/services/payment/auth.js')
const { default: register } = await import('../dist/server/services/authentication/register.js')
const { default: configurePassport } = await import('../dist/config/passport.js')
const { errorHandler } = await import('../dist/server/utils/errors.js')
const sessions = new Map()
const emails = []
let failMail = false
const stripeClient = new Stripe('sk_test_isolated_fixture')
stripeClient.checkout.sessions.create = async (params, options) => {
  if (sessions.has(options.idempotencyKey)) return sessions.get(options.idempotencyKey)
  const session = {
    id: `cs_test_${randomUUID()}`,
    status: 'open',
    payment_status: 'unpaid',
    mode: 'payment',
    currency: 'eur',
    amount_total: params.line_items[0].price_data.unit_amount,
    livemode: false,
    metadata: params.metadata,
    url: 'https://checkout.stripe.com/test',
    payment_intent: `pi_${randomUUID()}`,
  }
  sessions.set(options.idempotencyKey, session)
  sessions.set(session.id, session)
  return session
}
stripeClient.checkout.sessions.retrieve = async (id) => sessions.get(id)
const service = createPaymentService({
  stripeClient,
  sendMail: async (options) => {
    if (failMail) throw new Error('SMTP unavailable')
    emails.push(options)
  },
})
let database, listener, base
const person = {
  firstName: 'Test',
  lastName: 'Member',
  email: 'member@example.test',
  hometown: 'Turku',
  tyyMember: true,
  tiviaMember: false,
  role: 'Member',
  accessRights: false,
  password: 'test-password',
  accountCreated: new Date(),
  accepted: true,
}

before(async () => {
  database = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '8.0.16' } })
  await mongoose.connect(database.getUri())
  await Promise.all([Member.init(), TempMember.init(), Payment.init(), Product.init()])
  configurePassport(passport)
  const app = express()
  app.set('trust proxy', 1)
  app.post('/pay/webhook', express.raw({ type: 'application/json' }), service.stripeWebhook)
  app.use(express.json(), cookieParser(), passport.initialize())
  app.post('/register', register.registerUser)
  app.post('/api/pay', authenticatePayment, service.createPayment)
  app.get('/api/pay/session-status', service.getPaymentStatus)
  app.get('/private', passport.authenticate('jwt', { session: false }), (req, res) => res.json({ id: req.user.id }))
  app.use(errorHandler)
  listener = app.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  base = `http://127.0.0.1:${listener.address().port}`
})
after(async () => {
  if (listener) await new Promise((resolve) => listener.close(resolve))
  await mongoose.disconnect()
  if (database) await database.stop()
})
beforeEach(async () => {
  mock.restoreAll()
  for (const model of [Member, TempMember, Payment, Product]) await model.deleteMany({})
  sessions.clear()
  emails.length = 0
  failMail = false
  await Product.create({
    productId: '1111',
    name: 'Jäsenyys 1 vuosi',
    category: 'Membership',
    priceSnt: 500,
    membershipDuration: 1,
  })
})

async function post(path, body, token) {
  return fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'JWT ' + token } : {}) },
    body: JSON.stringify(body),
  })
}
async function checkout(member = null, extra = {}) {
  member ||= await Member.create(person)
  const token = jwt.sign({ _id: member._id }, process.env.SECRET)
  const response = await post('/api/pay', { productId: '1111', checkoutId: randomUUID(), ...extra }, token)
  assert.equal(response.status, 200)
  const body = await response.json()
  return {
    member,
    token,
    ...body.data,
    session: sessions.get(body.data.sessionId),
    cookie: response.headers.get('set-cookie'),
  }
}
async function webhook(session, type = 'checkout.session.completed', signature = true) {
  const payload = JSON.stringify({ id: `evt_${randomUUID()}`, type, data: { object: session } })
  const header = stripeClient.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET })
  return fetch(base + '/pay/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': signature ? header : 'bad' },
    body: payload,
  })
}
async function status(sessionId, stamp, cookie) {
  return fetch(
    base + '/api/pay/session-status?' + new URLSearchParams({ session_id: sessionId, ...(stamp ? { stamp } : {}) }),
    {
      headers: cookie ? { Cookie: cookie } : {},
    }
  )
}

test('checkout requires authentication and uses server pricing and authenticated identity', async () => {
  assert.equal((await post('/api/pay', { productId: '1111', checkoutId: randomUUID() })).status, 401)
  const result = await checkout(null, { memberId: new mongoose.Types.ObjectId(), amountSnt: 1 })
  const payment = await Payment.findOne()
  assert.equal(payment.memberId, result.member.id)
  assert.equal(result.session.amount_total, 500)
  assert.equal(payment.membershipDuration, 1)
})

test('concurrent checkout retries reuse the local payment and Stripe idempotency key', async () => {
  const member = await Member.create(person)
  const checkoutId = randomUUID()
  const results = await Promise.all([checkout(member, { checkoutId }), checkout(member, { checkoutId })])
  assert.equal(await Payment.countDocuments(), 1)
  assert.equal(results[0].sessionId, results[1].sessionId)
})

test('checkout issues a scoped HttpOnly receipt cookie, including Secure behind HTTPS', async () => {
  const result = await checkout()
  assert.match(result.cookie, /; HttpOnly/i)
  assert.match(result.cookie, /; SameSite=Lax/i)
  assert.match(result.cookie, /; Max-Age=86400/i)
  assert.match(result.cookie, /; Path=\/api\/pay\/session-status(?:;|$)/i)
  assert.doesNotMatch(result.cookie, /; Domain=/i)
  const response = await fetch(base + '/api/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'JWT ' + result.token, 'X-Forwarded-Proto': 'https' },
    body: JSON.stringify({ productId: '1111', checkoutId: randomUUID() }),
  })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('set-cookie'), /; Secure/i)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('receipt cookie recovers pending and completed payments without a tab storage stamp', async () => {
  const result = await checkout()
  const cookie = result.cookie.split(';')[0]
  result.session.payment_status = 'paid'
  const pending = await status(result.sessionId, undefined, cookie)
  assert.equal(pending.status, 200)
  assert.equal((await pending.json()).data.state, 'pending')
  assert.equal((await Payment.findOne()).processed, false)
  assert.equal((await webhook(result.session)).status, 200)
  const membershipEnds = (await Member.findById(result.member.id)).membershipEnds.toISOString()
  for (let visit = 0; visit < 2; visit++) {
    const completed = await status(result.sessionId, undefined, cookie)
    assert.equal(completed.status, 200)
    assert.equal(completed.headers.get('cache-control'), 'no-store')
    assert.equal((await completed.json()).data.state, 'complete')
  }
  assert.equal((await Member.findById(result.member.id)).membershipEnds.toISOString(), membershipEnds)
  assert.equal(emails.length, 1)
})

test('receipt cookies cannot authorize another payment and simultaneous checkouts stay separate', async () => {
  const first = await checkout()
  const second = await checkout(await Member.create({ ...person, email: 'second@example.test' }))
  const firstCookie = first.cookie.split(';')[0]
  const secondCookie = second.cookie.split(';')[0]
  assert.notEqual(firstCookie.split('=')[0], secondCookie.split('=')[0])
  assert.equal((await status(first.sessionId)).status, 400)
  assert.equal((await status(first.sessionId, undefined, secondCookie)).status, 400)
  assert.equal((await status(first.sessionId, undefined, `payment_${first.sessionId}=${second.stamp}`)).status, 404)
  assert.equal((await status(first.sessionId, 'wrong-stamp-that-is-long-enough-to-validate', firstCookie)).status, 404)
  assert.equal((await status('invalid/session', undefined, firstCookie)).status, 400)
  await webhook({ ...first.session, payment_status: 'paid' })
  const bothCookies = `${firstCookie}; ${secondCookie}`
  assert.equal((await (await status(first.sessionId, undefined, bothCookies)).json()).data.state, 'complete')
  assert.equal((await (await status(second.sessionId, undefined, bothCookies)).json()).data.state, 'pending')
})

test('signature verification and paid status gate membership fulfillment', async () => {
  const result = await checkout()
  assert.equal((await webhook({ ...result.session, payment_status: 'paid' }, undefined, false)).status, 400)
  assert.equal((await webhook(result.session)).status, 200)
  assert.equal((await Payment.findOne()).processed, false)
  assert.equal((await Member.findById(result.member.id)).membershipEnds, undefined)
  assert.equal(emails.length, 0)
  assert.equal(
    (await webhook({ ...result.session, payment_status: 'paid' }, 'checkout.session.async_payment_succeeded')).status,
    200
  )
  assert.equal((await Payment.findOne()).processed, true)
})

test('paid events belonging to another integration are acknowledged without side effects', async () => {
  assert.equal((await webhook({ id: 'cs_unrelated', payment_status: 'paid', metadata: {} })).status, 200)
  assert.equal(await Payment.countDocuments(), 0)
  assert.equal(emails.length, 0)
})

test('duplicate and concurrent webhook deliveries extend membership exactly once', async () => {
  const result = await checkout()
  const paid = { ...result.session, payment_status: 'paid' }
  await Promise.all([webhook(paid), webhook(paid), webhook(paid)])
  assert.equal((await webhook(paid)).status, 200)
  const member = await Member.findById(result.member.id)
  assert.equal(member.membershipEnds.toISOString(), computeMembershipEndDate(1).toISOString())
  assert.equal(await Payment.countDocuments({ processed: true }), 1)
  assert.equal(emails.length, 1)
})

test('database failure rolls back membership and payment, then webhook retry succeeds', async () => {
  const result = await checkout()
  const paid = { ...result.session, payment_status: 'paid' }
  const original = Payment.prototype.save
  mock.method(Payment.prototype, 'save', async function (...args) {
    if (this.processed) throw new Error('Injected write failure')
    return original.apply(this, args)
  })
  assert.equal((await webhook(paid)).status, 500)
  assert.equal((await Payment.findOne()).processed, false)
  assert.equal((await Member.findById(result.member.id)).membershipEnds, undefined)
  mock.restoreAll()
  assert.equal((await webhook(paid)).status, 200)
  assert.equal((await Payment.findOne()).processed, true)
})

test('separate concurrent payments both extend membership without losing an update', async () => {
  const member = await Member.create(person)
  const first = await checkout(member)
  const second = await checkout(member)
  const paid = [first, second].map((result) => ({ ...result.session, payment_status: 'paid' }))
  const responses = await Promise.all(paid.map((session) => webhook(session)))
  assert.ok(responses.every((response) => response.status === 200))
  assert.equal(
    (await Member.findById(member.id)).membershipEnds.toISOString(),
    computeMembershipEndDate(2).toISOString()
  )
  assert.equal(await Payment.countDocuments({ processed: true }), 2)
})

test('product edits do not change the price or membership duration already purchased', async () => {
  const result = await checkout()
  await Product.updateOne({ productId: '1111' }, { priceSnt: 2000, membershipDuration: 5 })
  assert.equal((await webhook({ ...result.session, payment_status: 'paid' })).status, 200)
  const payment = await Payment.findOne()
  assert.equal(payment.amountSnt, 500)
  assert.equal(
    (await Member.findById(result.member.id)).membershipEnds.toISOString(),
    computeMembershipEndDate(1).toISOString()
  )
})

test('receipt failure is retried without granting a second membership period', async () => {
  const result = await checkout()
  const paid = { ...result.session, payment_status: 'paid' }
  failMail = true
  assert.equal((await webhook(paid)).status, 500)
  const end = (await Member.findById(result.member.id)).membershipEnds.toISOString()
  assert.ok((await Payment.findOne()).notificationError)
  failMail = false
  assert.equal((await webhook(paid)).status, 200)
  assert.equal((await Member.findById(result.member.id)).membershipEnds.toISOString(), end)
  assert.equal(emails.length, 1)
  assert.ok((await Payment.findOne()).notifiedAt)
})

test('wrong amount, currency, mode, environment or session never grants membership', async () => {
  for (const changed of [
    { amount_total: 1 },
    { currency: 'usd' },
    { mode: 'subscription' },
    { livemode: true },
    { id: 'cs_wrong' },
  ]) {
    const result = await checkout(await Member.create({ ...person, email: `${randomUUID()}@example.test` }))
    assert.equal((await webhook({ ...result.session, payment_status: 'paid', ...changed })).status, 200)
    assert.equal((await Member.findById(result.member.id)).membershipEnds, undefined)
    assert.equal((await Payment.findOne({ stripeCheckoutSessionId: result.sessionId })).needsManualReview, true)
    const response = await status(result.sessionId, result.stamp)
    assert.equal((await response.json()).data.state, 'review')
  }
})

test('status is read-only and accepts the private stamp; delayed failures and expiry are visible', async () => {
  const result = await checkout()
  result.session.payment_status = 'paid'
  const pending = await (await status(result.sessionId, result.stamp)).json()
  assert.equal(pending.data.state, 'pending')
  assert.equal((await Payment.findOne()).processed, false)
  assert.equal((await status(result.sessionId, 'wrong-stamp-that-is-long-enough-to-validate')).status, 404)
  for (const [event, state] of [
    ['checkout.session.async_payment_failed', 'failed'],
    ['checkout.session.expired', 'expired'],
  ]) {
    assert.equal((await webhook(result.session, event)).status, 200)
    assert.equal((await (await status(result.sessionId, result.stamp)).json()).data.state, state)
  }
  await webhook(result.session)
  await webhook(result.session, 'checkout.session.expired')
  const completed = await (await status(result.sessionId, result.stamp)).json()
  assert.equal(completed.data.state, 'complete')
  assert.equal(completed.data.paymentData.amount, 500)
})

test('new registration receives a checkout-only token and becomes a member after payment', async () => {
  const registered = await (await post('/register', person)).json()
  const { paymentToken, memberId } = registered.data
  assert.ok(paymentToken)
  const response = await post('/api/pay', { productId: '1111', checkoutId: randomUUID(), paymentToken })
  assert.equal(response.status, 200)
  const { sessionId } = (await response.json()).data
  assert.equal((await webhook({ ...sessions.get(sessionId), payment_status: 'paid' })).status, 200)
  assert.equal(await TempMember.countDocuments(), 0)
  const member = await Member.findById(memberId)
  assert.equal(member.role, 'Member')
  assert.equal(member.accepted, false)
  assert.equal(member.accessRights, false)
  assert.equal(emails.length, 2)
  assert.ok(emails.some((email) => email.text.includes('/forgot')))
  const cookieStatus = await status(sessionId, undefined, response.headers.get('set-cookie').split(';')[0])
  assert.equal((await cookieStatus.json()).data.state, 'complete')
  assert.equal((await fetch(base + '/private', { headers: { Authorization: 'JWT ' + paymentToken } })).status, 401)
})

test('expired registration tokens cannot create checkout sessions', async () => {
  const temp = await TempMember.create(person)
  const paymentToken = jwt.sign({ sub: temp.id, purpose: 'registration-payment' }, process.env.SECRET, {
    audience: 'checkout',
    expiresIn: -1,
  })
  assert.equal((await post('/api/pay', { productId: '1111', checkoutId: randomUUID(), paymentToken })).status, 401)
  assert.equal(await Payment.countDocuments(), 0)
})

test('membership renewal handles the Finnish August boundary and active membership', () => {
  assert.equal(
    computeMembershipEndDate(1, undefined, new Date('2026-07-31T20:59:59Z')).toISOString(),
    '2026-07-31T20:59:59.999Z'
  )
  assert.equal(
    computeMembershipEndDate(1, undefined, new Date('2026-07-31T21:00:00Z')).toISOString(),
    '2027-07-31T20:59:59.999Z'
  )
  assert.equal(
    computeMembershipEndDate(5, new Date('2027-07-31T20:59:59.999Z'), new Date('2026-09-01')).toISOString(),
    '2032-07-31T20:59:59.999Z'
  )
})
