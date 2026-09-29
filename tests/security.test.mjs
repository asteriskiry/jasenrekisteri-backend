import { test, before, after, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import express from 'express'
import passport from 'passport'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

const logDirectory = await mkdtemp(join(tmpdir(), 'rekkari-security-tests-'))
process.env.SECRET = 'isolated-security-test-secret-at-least-32-characters'
process.env.CLIENTURL = 'https://register.example.test'
process.env.ENV = 'production'
process.env.LOGPATH = logDirectory
process.env.STRIPE_SECRET_KEY = ''
process.env.STRIPE_WEBHOOK_SECRET = ''
const { default: router } = await import('../dist/server/routes/apis/index.js')
const { default: configurePassport } = await import('../dist/config/passport.js')
const { default: Member } = await import('../dist/server/models/Member.js')
const { default: TempMember } = await import('../dist/server/models/TempMember.js')
const { default: ResetPassword } = await import('../dist/server/models/ResetPassword.js')
const { default: EmailChange } = await import('../dist/server/models/EmailChange.js')
const { default: AbuseBucket } = await import('../dist/server/models/AbuseBucket.js')
const { errorHandler } = await import('../dist/server/utils/errors.js')
const { createSession, SESSION_COOKIE } = await import('../dist/server/services/authentication/session.js')
const { authLimit } = await import('../dist/server/utils/authLimits.js')
const { waitForSecurityMail } = await import('../dist/server/utils/securityMail.js')
const mail = await import('../dist/config/mail.js')
const person = {
  firstName: 'Test',
  lastName: 'Member',
  email: 'member@example.test',
  utuAccount: 'approved.person',
  hometown: 'Turku',
  tyyMember: false,
  tiviaMember: false,
  accepted: true,
  accessRights: true,
  role: 'Member',
  password: 'original-password',
  accountCreated: new Date(),
  membershipStarts: new Date('2026-01-01'),
  membershipEnds: new Date('2027-07-31'),
}
let database, listener, base, member, cookie
const sent = []

before(async () => {
  database = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '8.0.16' } })
  await mongoose.connect(database.getUri())
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()))
  configurePassport(passport)
  const app = express()
  app.use(express.json(), cookieParser(), passport.initialize())
  app.use('/api', router)
  // Independent middleware instances model separate workers sharing a database.
  app.get('/worker-a', authLimit('shared-test', 2, 60_000), (req, res) => res.sendStatus(200))
  app.get('/worker-b', authLimit('shared-test', 2, 60_000), (req, res) => res.sendStatus(200))
  app.use(errorHandler)
  listener = app.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  base = `http://127.0.0.1:${listener.address().port}`
})
beforeEach(async () => {
  mock.restoreAll()
  await waitForSecurityMail()
  for (const model of Object.values(mongoose.models)) await model.collection.deleteMany({})
  sent.length = 0
  mock.method(mail.transporter, 'sendMail', (options, callback) => {
    sent.push(options)
    callback(null, { messageId: 'isolated-test' })
  })
  member = await Member.create(person)
  cookie = `${SESSION_COOKIE}=${(await createSession(member)).token}`
})
afterEach(async () => {
  await waitForSecurityMail()
})
after(async () => {
  await waitForSecurityMail()
  mock.restoreAll()
  if (listener) await new Promise((resolve) => listener.close(resolve))
  await mongoose.disconnect()
  if (database) await database.stop()
  assert.equal(dirname(logDirectory), tmpdir())
  await rm(logDirectory, { recursive: true, force: true })
})
function request(method, path, body, auth) {
  return fetch(base + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: process.env.CLIENTURL,
      ...(auth ? { Cookie: auth } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}
const profile = (extra = {}) => ({ ...person, password: '', passwordAgain: '', ...extra })

test('approved UTU identifiers cannot be reassigned, cleared or bypassed with forged flags', async () => {
  for (const utuAccount of ['another.person', '', null]) {
    const response = await request(
      'PUT',
      '/member/details',
      profile({ utuAccount, accepted: false, accessRights: false }),
      cookie
    )
    assert.equal(response.status, 403)
    assert.equal((await response.json()).error.code, 'UTU_APPROVAL_REQUIRED')
  }
  const saved = await Member.findById(member.id)
  assert.equal(saved.utuAccount, person.utuAccount)
  assert.equal(saved.accepted, true)
  assert.equal(saved.accessRights, true)
  assert.equal((await request('PUT', '/member/details', profile({ hometown: 'Helsinki' }), cookie)).status, 200)
})

test('credential edits require the current password and preserve credentials on failure', async () => {
  for (const currentPassword of [undefined, '', 'wrong', {}]) {
    const response = await request(
      'PUT',
      '/member/details',
      profile({ email: 'new@example.test', password: 'new-password', passwordAgain: 'new-password', currentPassword }),
      cookie
    )
    assert.equal(response.status, 403)
  }
  const saved = await Member.findById(member.id)
  assert.equal(saved.email, person.email)
  assert.equal(saved.password, member.password)
  assert.equal(await EmailChange.countDocuments(), 0)
  assert.equal(sent.length, 0)
})

test('email changes require ownership confirmation, stay bound to the member and revoke sessions', async () => {
  const response = await request(
    'PUT',
    '/member/details',
    profile({ email: 'new@example.test', currentPassword: person.password }),
    cookie
  )
  assert.equal(response.status, 200)
  assert.equal((await Member.findById(member.id)).email, person.email)
  assert.equal(sent[0].to, 'new@example.test')
  const token = sent[0].text.match(/\/member\/email\/confirm\/([a-f0-9]{64})/)[1]
  assert.ok(!JSON.stringify(await EmailChange.findOne()).includes(token))
  assert.equal((await request('POST', '/member/email/confirm', { token })).status, 401)
  const other = await Member.create({ ...person, email: 'other@example.test' })
  const otherCookie = `${SESSION_COOKIE}=${(await createSession(other)).token}`
  assert.equal((await request('POST', '/member/email/confirm', { token }, otherCookie)).status, 410)
  assert.equal((await request('POST', '/member/email/confirm', { token: '0'.repeat(64) }, cookie)).status, 410)
  assert.equal((await request('POST', '/member/email/confirm', { token }, cookie)).status, 200)
  assert.equal((await Member.findById(member.id)).email, 'new@example.test')
  assert.equal((await request('GET', '/session', undefined, cookie)).status, 401)
  assert.equal(await EmailChange.countDocuments(), 0)
})

test('expired email confirmations and uniqueness races leave the original email intact', async () => {
  await request(
    'PUT',
    '/member/details',
    profile({ email: 'new@example.test', currentPassword: person.password }),
    cookie
  )
  const token = sent[0].text.match(/\/member\/email\/confirm\/([a-f0-9]{64})/)[1]
  await Member.create({ ...person, email: 'new@example.test' })
  assert.equal((await request('POST', '/member/email/confirm', { token }, cookie)).status, 409)
  assert.equal((await Member.findById(member.id)).email, person.email)
  await EmailChange.updateOne({}, { expiresAt: new Date(0) })
  assert.equal((await request('POST', '/member/email/confirm', { token }, cookie)).status, 410)
})

test('login throttles a normalized account and shared limits survive separate worker instances', async () => {
  for (let i = 0; i < 10; i++) {
    assert.equal(
      (await request('POST', '/login', { email: i % 2 ? 'MEMBER@example.test' : person.email, password: 'incorrect' }))
        .status,
      401
    )
  }
  const blocked = await request('POST', '/login', { email: person.email, password: person.password })
  assert.equal(blocked.status, 429)
  assert.ok(Number(blocked.headers.get('retry-after')) > 0)
  assert.equal((await fetch(base + '/worker-a')).status, 200)
  assert.equal((await fetch(base + '/worker-b')).status, 200)
  assert.equal((await fetch(base + '/worker-a')).status, 429)
  assert.ok(!JSON.stringify(await AbuseBucket.find()).includes(person.email))
})

test('a confirmation delivery failure does not misreport a committed password change', async () => {
  mock.method(mail.transporter, 'sendMail', (options, callback) => callback(new Error('SMTP unavailable')))
  const response = await request(
    'PUT',
    '/member/details',
    profile({
      email: 'new@example.test',
      currentPassword: person.password,
      password: 'changed-password',
      passwordAgain: 'changed-password',
    }),
    cookie
  )
  assert.equal(response.status, 200)
  assert.equal((await response.json()).data.verificationMailSent, false)
  const saved = await Member.findById(member.id)
  assert.equal(saved.email, person.email)
  assert.equal(await saved.comparePassword('changed-password'), true)
  assert.equal((await request('GET', '/session', undefined, cookie)).status, 401)
})

test('recovery responses hide membership and SMTP failures, and repeats preserve the usable link', async () => {
  const absent = await request('POST', '/forgot', { email: 'absent@example.test' })
  const known = await request('POST', '/forgot', { email: person.email })
  assert.equal(absent.status, 202)
  assert.equal(known.status, 202)
  assert.deepEqual(await absent.json(), await known.json())
  await waitForSecurityMail()
  assert.equal(sent.length, 1)
  const first = await ResetPassword.findOne({ userID: member.id })
  for (let i = 0; i < 5; i++) assert.equal((await request('POST', '/forgot', { email: person.email })).status, 202)
  // After a cooldown, an existing unexpired link is still not replaced.
  await AbuseBucket.deleteMany({})
  await request('POST', '/forgot', { email: person.email })
  await waitForSecurityMail()
  assert.equal(sent.length, 2)
  assert.equal(sent[0].text, sent[1].text)
  assert.equal((await ResetPassword.findOne({ userID: member.id })).resetPasswordToken, first.resetPasswordToken)
  await ResetPassword.deleteMany({})
  await AbuseBucket.deleteMany({})
  mock.method(mail.transporter, 'sendMail', (options, callback) => callback(new Error('SMTP unavailable')))
  assert.equal((await request('POST', '/forgot', { email: person.email })).status, 202)
  await waitForSecurityMail()
  assert.equal(await ResetPassword.countDocuments(), 1)
})

test('only one concurrent reset can consume a token and failed transactions retain it', async () => {
  const token = 'concurrent-reset-token'
  const record = await ResetPassword.create({
    userID: member.id,
    resetPasswordToken: await bcrypt.hash(token, 5),
    expire: new Date(Date.now() + 60_000),
  })
  const body = { userID: member.id, resetToken: token, password: 'new-password', passwordAgain: 'new-password' }
  const save = mock.method(Member.collection, 'updateOne', () => {
    throw new Error('Injected member write failure')
  })
  assert.equal((await request('POST', '/reset', body)).status, 500)
  assert.ok(await ResetPassword.findById(record.id))
  assert.equal((await Member.findById(member.id)).password, member.password)
  save.mock.restore()
  const results = await Promise.all(Array.from({ length: 6 }, () => request('POST', '/reset', body)))
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 410, 410, 410, 410, 410])
  assert.equal(await ResetPassword.countDocuments(), 0)
})

test('registration immediately returns checkout credentials without email delivery or confirmation', async () => {
  mock.method(mail.transporter, 'sendMail', () => {
    throw new Error('Registration must not send confirmation mail')
  })
  const response = await request('POST', '/register', { ...person, email: 'new@example.test' })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.success, true)
  assert.deepEqual(Object.keys(body.data).sort(), ['memberId', 'paymentToken'])
  const { memberId, paymentToken } = body.data
  assert.ok(await TempMember.findById(memberId))
  assert.equal(await Member.findById(memberId), null)
  assert.equal((await request('GET', '/session', undefined, SESSION_COOKIE + '=' + paymentToken)).status, 401)
  assert.equal((await request('POST', '/register', person)).status, 409)
  assert.equal((await request('POST', '/register/verify', { memberId, token: paymentToken })).status, 404)
  await waitForSecurityMail()
  assert.equal(mail.transporter.sendMail.mock.calls.length, 0)
})

test('identical registration retries reuse pending records without replacing corrected submissions or extending expiry', async () => {
  const payload = { ...person, email: 'pending@example.test' }
  const results = await Promise.all(Array.from({ length: 6 }, () => request('POST', '/register', payload)))
  assert.ok(results.every((result) => result.status === 200))
  const bodies = await Promise.all(results.map((result) => result.json()))
  assert.equal(new Set(bodies.map((body) => body.data.memberId)).size, 1)
  assert.equal(await TempMember.countDocuments({ email: payload.email }), 1)
  const original = await TempMember.findOne({ email: payload.email })
  const retried = await request('POST', '/register', { ...payload, email: 'PENDING@example.test' })
  assert.equal((await retried.json()).data.memberId, original.id)
  const saved = await TempMember.findById(original.id)
  assert.equal(saved.expiresAt.getTime(), original.expiresAt.getTime())
  const corrected = await request('POST', '/register', { ...payload, hometown: 'Helsinki' })
  const correctedId = (await corrected.json()).data.memberId
  assert.notEqual(correctedId, original.id)
  assert.equal((await TempMember.findById(correctedId)).hometown, 'Helsinki')
  assert.equal((await TempMember.findById(original.id)).hometown, 'Turku')
  await waitForSecurityMail()
  assert.equal(sent.length, 0)
})

test('registration abuse is throttled with an error rather than a false success', async () => {
  const payload = { ...person, email: 'pending@example.test' }
  for (let i = 0; i < 10; i++) assert.equal((await request('POST', '/register', payload)).status, 200)
  const blocked = await request('POST', '/register', payload)
  assert.equal(blocked.status, 429)
  assert.equal((await blocked.json()).success, false)
  assert.ok(Number(blocked.headers.get('retry-after')) > 0)
  assert.equal(await TempMember.countDocuments({ email: payload.email }), 1)
})
