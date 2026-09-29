import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import express from 'express'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

const logDirectory = await mkdtemp(join(tmpdir(), 'rekkari-auth-tests-'))
process.env.SECRET = 'isolated-auth-test-secret-at-least-32-characters'
process.env.CLIENTURL = 'https://register.example.test'
process.env.ENV = 'production'
process.env.LOGPATH = logDirectory
const { default: Member } = await import('../dist/server/models/Member.js')
const { default: LoginSession } = await import('../dist/server/models/LoginSession.js')
const { default: ResetPassword } = await import('../dist/server/models/ResetPassword.js')
const { default: AbuseBucket } = await import('../dist/server/models/AbuseBucket.js')
const { default: router } = await import('../dist/server/routes/apis/index.js')
const { default: configurePassport } = await import('../dist/config/passport.js')
const { errorHandler } = await import('../dist/server/utils/errors.js')
const { SESSION_COOKIE, SESSION_SECONDS } = await import('../dist/server/services/authentication/session.js')
const person = {
  firstName: 'Test',
  lastName: 'Member',
  email: 'member@example.test',
  hometown: 'Turku',
  tyyMember: false,
  tiviaMember: false,
  role: 'Member',
  accessRights: false,
  accepted: true,
  password: 'original-password',
  accountCreated: new Date(),
}
let database, listener, base, member

before(async () => {
  database = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '8.0.16' } })
  await mongoose.connect(database.getUri())
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()))
  configurePassport(passport)
  const app = express()
  app.use('/api/pay/webhook', express.raw({ type: 'application/json' }))
  app.use(express.json(), cookieParser(), passport.initialize())
  app.use('/api', router)
  app.use(errorHandler)
  listener = app.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  base = `http://127.0.0.1:${listener.address().port}/api`
})
beforeEach(async () => {
  await Promise.all([
    Member.deleteMany({}),
    LoginSession.deleteMany({}),
    ResetPassword.deleteMany({}),
    AbuseBucket.deleteMany({}),
  ])
  member = await Member.create(person)
})
after(async () => {
  if (listener) await new Promise((resolve) => listener.close(resolve))
  await mongoose.disconnect()
  if (database) await database.stop()
  assert.equal(dirname(logDirectory), tmpdir())
  await rm(logDirectory, { recursive: true, force: true })
})
function request(method, path, body, cookie, headers = {}) {
  return fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: process.env.CLIENTURL,
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}
async function login(cookie) {
  const response = await request('POST', '/login', { email: person.email, password: person.password }, cookie)
  assert.equal(response.status, 200)
  const header = response.headers.getSetCookie().find((value) => value.startsWith(SESSION_COOKIE + '='))
  return {
    response,
    header,
    cookie: header.split(';')[0],
    token: header.split(';')[0].slice(SESSION_COOKIE.length + 1),
    body: await response.json(),
  }
}

test('login issues an eight-hour HttpOnly Secure cookie with minimal signed claims and no token in JSON', async () => {
  const { response, header, token, body } = await login()
  assert.match(header, /^__Host-jasenrekisteri-session=/)
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) assert.ok(header.includes(attribute))
  assert.doesNotMatch(header, /Domain=/i)
  const maxAge = Number(header.match(/Max-Age=(\d+)/)[1])
  assert.ok(maxAge > SESSION_SECONDS - 3 && maxAge <= SESSION_SECONDS)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(Object.keys(body.data).sort(), ['expiresAt', 'id', 'role'])
  const claims = jwt.verify(token, process.env.SECRET, {
    algorithms: ['HS256'],
    issuer: 'jasenrekisteri',
    audience: 'member-session',
  })
  assert.deepEqual(Object.keys(claims).sort(), ['aud', 'exp', 'iat', 'iss', 'jti', 'purpose', 'sub'])
  assert.equal(claims.sub, member.id)
  assert.equal(claims.exp - claims.iat, SESSION_SECONDS)
  assert.equal(claims.exp * 1000, Date.parse(body.data.expiresAt))
  assert.ok(!JSON.stringify(claims).includes(member.password))
  assert.equal(await LoginSession.countDocuments(), 1)
  for (const name of ['jasenrekisteri-token', 'role', 'id'])
    assert.ok(response.headers.getSetCookie().some((value) => value.startsWith(name + '=;')))
})

test('session restores identity, reads current roles and preserves role isolation', async () => {
  const { cookie } = await login()
  const restored = await request('GET', '/session', undefined, cookie)
  assert.equal(restored.status, 200)
  assert.equal((await restored.json()).data.id, member.id)
  assert.equal((await request('GET', `/admin/profile?memberID=${member.id}`, undefined, cookie)).status, 403)
  await Member.updateOne({ _id: member.id }, { role: 'Admin' })
  assert.equal((await (await request('GET', '/session', undefined, cookie)).json()).data.role, 'Admin')
  assert.equal((await request('GET', '/admin/list', undefined, cookie)).status, 200)
  await Member.updateOne({ _id: member.id }, { role: 'Member' })
  assert.equal((await request('GET', `/admin/profile?memberID=${member.id}`, undefined, cookie)).status, 403)
  await Member.deleteOne({ _id: member.id })
  assert.equal((await request('GET', '/session', undefined, cookie)).status, 401)
})

test('logout revokes the server session so a copied cookie cannot be replayed', async () => {
  const { cookie } = await login()
  const response = await request('POST', '/logout', {}, cookie)
  assert.equal(response.status, 200)
  assert.ok(response.headers.getSetCookie().some((value) => value.startsWith(SESSION_COOKIE + '=;')))
  assert.equal(await LoginSession.countDocuments(), 0)
  assert.equal((await request('GET', '/member/details', undefined, cookie)).status, 401)
  assert.equal((await request('POST', '/logout', {}, cookie)).status, 200)
})

test('re-login rotates and revokes the previous browser session', async () => {
  const first = await login()
  const second = await login(first.cookie)
  assert.notEqual(first.token, second.token)
  assert.equal(await LoginSession.countDocuments(), 1)
  assert.equal((await request('GET', '/session', undefined, first.cookie)).status, 401)
  assert.equal((await request('GET', '/session', undefined, second.cookie)).status, 200)
})

test('legacy headers, legacy cookies, registration tokens and forged cookies cannot authenticate', async () => {
  const legacy = jwt.sign(member.toJSON(), process.env.SECRET, { expiresIn: '180d' })
  const registration = jwt.sign({ sub: member.id, purpose: 'registration-payment' }, process.env.SECRET, {
    audience: 'checkout',
    expiresIn: '1h',
  })
  const current = await login()
  for (const cookie of [
    undefined,
    `jasenrekisteri-token=${legacy}`,
    `${SESSION_COOKIE}=${legacy}`,
    `${SESSION_COOKIE}=${registration}`,
    `${SESSION_COOKIE}=${current.token}bad`,
  ]) {
    assert.equal((await request('GET', '/session', undefined, cookie, { Authorization: 'JWT ' + legacy })).status, 401)
  }
  assert.equal(
    (await request('GET', '/session', undefined, undefined, { Authorization: 'JWT ' + current.token })).status,
    401
  )
})

test('JWT and database expiry are both enforced independently of Mongo TTL cleanup', async () => {
  const { cookie, token } = await login()
  const claims = jwt.decode(token)
  const expired = jwt.sign(
    { ...claims, iat: claims.iat - SESSION_SECONDS - 1, exp: claims.iat - 1 },
    process.env.SECRET
  )
  assert.equal((await request('GET', '/session', undefined, `${SESSION_COOKIE}=${expired}`)).status, 401)
  for (const change of [
    { exp: claims.iat + SESSION_SECONDS + 1 },
    { aud: 'checkout' },
    { purpose: 'registration-payment' },
  ]) {
    const invalid = jwt.sign({ ...claims, ...change }, process.env.SECRET)
    assert.equal((await request('GET', '/session', undefined, `${SESSION_COOKIE}=${invalid}`)).status, 401)
  }
  await LoginSession.updateOne({ _id: claims.jti }, { expiresAt: new Date(Date.now() - 1000) })
  assert.equal((await request('GET', '/session', undefined, cookie)).status, 401)
})

test('CSRF protection rejects missing headers and foreign/null origins on login, writes and logout', async () => {
  const { cookie } = await login()
  for (const headers of [
    { 'X-Requested-With': '' },
    { Origin: 'https://evil.example.test' },
    { Origin: 'null' },
    { Origin: '', Referer: 'https://evil.example.test/page' },
  ]) {
    for (const path of ['/login', '/logout', '/admin/new', '/pay']) {
      const response = await request('POST', path, {}, cookie, headers)
      assert.equal(response.status, 403)
      assert.equal((await response.json()).error.code, 'CSRF_REJECTED')
    }
  }
  assert.equal((await request('GET', '/session', undefined, cookie)).status, 200)
  // A non-browser operator may supply the custom header without Origin.
  assert.equal((await request('POST', '/logout', {}, cookie, { Origin: '' })).status, 200)
})

test('webhooks remain exempt from browser CSRF checks and still require Stripe verification', async () => {
  const response = await request('POST', '/pay/webhook', {}, undefined, { 'X-Requested-With': '', Origin: '' })
  // Unconfigured Stripe returns 503; configured Stripe rejects the signature with 400.
  assert.ok([400, 503].includes(response.status))
})

test('password changes invalidate every existing session', async () => {
  const first = await login()
  const second = await login()
  const response = await request(
    'PUT',
    '/member/details',
    { ...person, password: 'changed-password', passwordAgain: 'changed-password', currentPassword: person.password },
    first.cookie
  )
  assert.equal(response.status, 200)
  for (const { cookie } of [first, second])
    assert.equal((await request('GET', '/session', undefined, cookie)).status, 401)
  const next = await request('POST', '/login', { email: person.email, password: 'changed-password' })
  assert.equal(next.status, 200)
})

test('password recovery works without login and invalidates prior sessions', async () => {
  const { cookie } = await login()
  const token = 'isolated-reset-token'
  await ResetPassword.create({
    userID: member.id,
    resetPasswordToken: await bcrypt.hash(token, 5),
    expire: Date.now() + 60000,
  })
  const body = {
    userID: member.id,
    resetToken: token,
    password: 'recovered-password',
    passwordAgain: 'recovered-password',
  }
  assert.equal((await request('POST', '/reset', { ...body, resetToken: 'wrong' })).status, 410)
  assert.equal((await request('POST', '/reset', body)).status, 200)
  assert.equal((await request('POST', '/reset', body)).status, 410)
  assert.equal((await request('GET', '/session', undefined, cookie)).status, 401)
})

test('incorrect credentials do not create sessions or return authentication cookies', async () => {
  const response = await request('POST', '/login', { email: person.email, password: 'wrong' })
  assert.equal(response.status, 401)
  assert.equal(response.headers.get('set-cookie'), null)
  assert.equal(await LoginSession.countDocuments(), 0)
})

test('invalid recovery passwords preserve the hash, reset token and existing session', async () => {
  const { cookie } = await login()
  const token = 'reset-validation-test'
  const record = await ResetPassword.create({
    userID: member.id,
    resetPasswordToken: await bcrypt.hash(token, 5),
    expire: Date.now() + 60000,
  })
  for (const password of ['', 'short', null, undefined, 123456, [], {}]) {
    const response = await request('POST', '/reset', {
      userID: member.id,
      resetToken: token,
      password,
      passwordAgain: password,
    })
    assert.equal(response.status, 400)
    assert.ok((await response.json()).error.details.password)
    assert.equal((await Member.findById(member.id)).password, member.password)
    assert.ok(await ResetPassword.findById(record.id))
  }
  assert.equal((await request('GET', '/session', undefined, cookie)).status, 200)
  const recovered = await request('POST', '/reset', {
    userID: member.id,
    resetToken: token,
    password: 'valid-password',
    passwordAgain: 'valid-password',
  })
  assert.equal(recovered.status, 200)
  assert.equal(await ResetPassword.findById(record.id), null)
  const saved = await Member.findById(member.id)
  assert.match(saved.password, /^\$2[aby]\$/)
  assert.equal(await saved.comparePassword('valid-password'), true)
  assert.equal((await request('GET', '/session', undefined, cookie)).status, 401)
})

test('password changes reject a missing or mismatched confirmation', async () => {
  for (const passwordAgain of [undefined, '', 'different-password']) {
    const response = await request('POST', '/reset', {
      userID: member.id,
      resetToken: 'unused',
      password: 'valid-password',
      passwordAgain,
    })
    assert.equal(response.status, 400)
    assert.ok((await response.json()).error.details.passwordAgain)
    assert.equal((await Member.findById(member.id)).password, member.password)
  }
})

test('model updates cannot bypass plaintext password validation or store an unhashed $set password', async () => {
  for (const password of ['', 'short', null, 123456]) {
    for (const update of [{ password }, { $set: { password } }]) {
      await assert.rejects(
        Member.findOneAndUpdate({ _id: member.id }, update).exec(),
        /Password must be at least 6 characters/
      )
      assert.equal((await Member.findById(member.id)).password, member.password)
    }
  }
  await Member.findOneAndUpdate({ _id: member.id }, { $set: { password: 'valid-password' } }, { runValidators: true })
  const saved = await Member.findById(member.id)
  assert.match(saved.password, /^\$2[aby]\$/)
  assert.equal(await saved.comparePassword('valid-password'), true)
})

test('public registration rejects unsafe UTU accounts before creating a temporary member', async () => {
  const TempMember = mongoose.model('TempMember')
  const count = await TempMember.countDocuments()
  for (const utuAccount of ['=1+1', 'test;row', 'test\nrow', 'test\rrow', 123, {}]) {
    const response = await request('POST', '/register', { ...person, email: 'new@example.test', utuAccount })
    assert.equal(response.status, 400)
    assert.ok((await response.json()).error.details.utuAccount)
  }
  assert.equal(await TempMember.countDocuments(), count)
})
