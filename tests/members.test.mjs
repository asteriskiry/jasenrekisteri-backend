import { test, before, after, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import express from 'express'
import mongoose from 'mongoose'
import passport from 'passport'
import cookieParser from 'cookie-parser'
import { MongoMemoryServer } from 'mongodb-memory-server'

const logDirectory = await mkdtemp(join(tmpdir(), 'rekkari-member-tests-'))
process.env.SECRET = 'isolated-member-test-secret-at-least-32-characters'
process.env.LOGPATH = logDirectory
process.env.IMPORT_MODE = '0'
process.env.BOARDMAILADDRESS = 'board@example.test'
process.env.MAILSENDER = 'register@example.test'
const { default: Member } = await import('../dist/server/models/Member.js')
const { default: adminRouter } = await import('../dist/server/controllers/apis/admin.js')
const { default: memberRouter } = await import('../dist/server/controllers/apis/member.js')
const { default: configurePassport } = await import('../dist/config/passport.js')
const { createSession, SESSION_COOKIE } = await import('../dist/server/services/authentication/session.js')
const { errorHandler } = await import('../dist/server/utils/errors.js')
const mail = await import('../dist/config/mail.js')
const sent = []
const fields = {
  firstName: 'Test',
  lastName: 'Member',
  email: 'member@example.test',
  hometown: 'Turku',
  utuAccount: '',
  tyyMember: false,
  tiviaMember: false,
  role: 'Member',
  accessRights: false,
  accepted: false,
  membershipStarts: '2026-09-29T00:00:00.000Z',
  membershipEnds: '2027-07-31T20:59:59.999Z',
}
let database, listener, base, admin, member

before(async () => {
  database = await MongoMemoryServer.create({ binary: { version: '8.0.16' } })
  await mongoose.connect(database.getUri())
  await Member.init()
  configurePassport(passport)
  mock.method(mail.transporter, 'sendMail', (options, callback) => {
    sent.push(options)
    callback(null, { messageId: 'isolated-test' })
  })
  const app = express()
  app.use(express.json(), cookieParser(), passport.initialize())
  app.use('/api/admin', adminRouter)
  app.use('/api/member', memberRouter)
  app.use(errorHandler)
  listener = app.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  base = `http://127.0.0.1:${listener.address().port}/api`
})

after(async () => {
  if (listener) await new Promise((resolve) => listener.close(resolve))
  await mongoose.disconnect()
  if (database) await database.stop()
  mock.restoreAll()
  assert.equal(dirname(logDirectory), tmpdir())
  await rm(logDirectory, { recursive: true, force: true })
})

async function createMember(extra = {}) {
  return Member.create({ ...fields, password: 'original-password', accountCreated: new Date(), ...extra })
}

beforeEach(async () => {
  await Member.deleteMany({})
  sent.length = 0
  admin = await createMember({ role: 'Admin', email: 'admin@example.test' })
  member = await createMember()
})

async function request(method, path, body, actor = admin) {
  const token = actor && (await createSession(actor)).token
  return fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Cookie: `${SESSION_COOKIE}=${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

test('manual creation accepts untouched checkboxes and optional UTU account', async () => {
  for (const empty of [null, undefined]) {
    const payload = { ...fields, email: `${empty === null ? 'null' : 'missing'}@example.test`, utuAccount: empty }
    for (const name of ['tyyMember', 'tiviaMember', 'accessRights', 'accepted']) payload[name] = empty
    const response = await request('POST', '/admin/new', payload)
    assert.equal(response.status, 200)
    assert.equal((await response.json()).success, true)
    const saved = await Member.findOne({ email: payload.email })
    for (const name of ['tyyMember', 'tiviaMember', 'accessRights', 'accepted']) assert.equal(saved[name], false)
    assert.equal(saved.utuAccount, '')
    assert.match(saved.password, /^\$2[aby]\$/)
  }
  assert.equal(sent.length, 4)
})

test('manual creation still rejects invalid boolean values without saving a user', async () => {
  const response = await request('POST', '/admin/new', { ...fields, email: 'invalid@example.test', accepted: 'false' })
  assert.equal(response.status, 400)
  assert.ok((await response.json()).error.details.accepted)
  assert.equal(await Member.countDocuments(), 2)
  assert.equal(sent.length, 0)
})

test('admin can read an ordinary member and saved updates survive a fresh details request', async () => {
  const path = `/admin/profile?memberID=${member.id}`
  const before = await (await request('GET', path)).json()
  assert.equal(before.firstName, fields.firstName)
  assert.equal(before.password, undefined)
  const updates = {
    ...fields,
    memberID: member.id,
    hometown: 'Helsinki',
    tiviaMember: true,
    membershipEnds: '2028-07-31T20:59:59.999Z',
    password: '',
    passwordAgain: '',
  }
  const response = await request('PUT', '/admin/update', updates)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).success, true)
  const after = await (await request('GET', path)).json()
  assert.equal(after.hometown, 'Helsinki')
  assert.equal(after.tiviaMember, true)
  assert.equal(after.membershipEnds, updates.membershipEnds)
  assert.equal((await Member.findById(member.id)).password, member.password)
})

test('profile permissions use the viewer role and reject unauthorized writes', async () => {
  const path = `/admin/profile?memberID=${member.id}`
  const board = await createMember({ role: 'Board', email: 'board@example.test' })
  assert.equal((await request('GET', path, undefined, board)).status, 200)
  assert.equal((await request('GET', path, undefined, member)).status, 403)
  assert.equal((await request('GET', `/admin/profile?memberID=${admin.id}`, undefined, member)).status, 403)
  assert.equal((await request('GET', path, undefined, null)).status, 401)
  for (const actor of [board, member]) {
    const response = await request(
      'PUT',
      '/admin/update',
      { ...fields, memberID: member.id, hometown: 'Helsinki' },
      actor
    )
    assert.equal(response.status, 403)
  }
  assert.equal((await Member.findById(member.id)).hometown, fields.hometown)
})

test('admin profile reads and updates reject invalid and missing targets', async () => {
  for (const [id, expected] of [
    ['invalid-id', 400],
    [new mongoose.Types.ObjectId().toString(), 404],
  ]) {
    assert.equal((await request('GET', `/admin/profile?memberID=${id}`)).status, expected)
    assert.equal((await request('PUT', '/admin/update', { ...fields, memberID: id })).status, expected)
  }
})

test('admin updates without password fields preserve the existing password', async () => {
  const response = await request('PUT', '/admin/update', { ...fields, memberID: member.id, hometown: 'Helsinki' })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).success, true)
  const saved = await Member.findById(member.id)
  assert.equal(saved.hometown, 'Helsinki')
  assert.equal(saved.password, member.password)
})

test('approval mail is sent only after a successful save and only on the acceptance transition', async () => {
  const update = { ...fields, memberID: member.id, accepted: true }
  const duplicate = await request('PUT', '/admin/update', { ...update, email: admin.email })
  assert.equal(duplicate.status, 409)
  assert.equal((await Member.findById(member.id)).accepted, false)
  assert.equal(sent.length, 0)
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal((await request('PUT', '/admin/update', update)).status, 200)
  }
  assert.equal((await Member.findById(member.id)).accepted, true)
  assert.equal(sent.length, 1)
})

test('member updates save TIVIA and personal details without changing another user or granting privileges', async () => {
  const response = await request(
    'PUT',
    '/member/details',
    {
      ...fields,
      memberID: admin.id,
      role: 'Admin',
      accepted: true,
      accessRights: true,
      hometown: 'Helsinki',
      tiviaMember: true,
      password: '',
      passwordAgain: '',
    },
    member
  )
  assert.equal(response.status, 200)
  assert.equal((await response.json()).success, true)
  const saved = await (await request('GET', '/member/details', undefined, member)).json()
  assert.equal(saved.hometown, 'Helsinki')
  assert.equal(saved.tiviaMember, true)
  assert.equal(saved.role, 'Member')
  assert.equal(saved.accepted, false)
  assert.equal(saved.accessRights, false)
  assert.equal(saved.password, undefined)
  assert.equal((await Member.findById(admin.id)).hometown, 'Turku')
  assert.equal((await Member.findById(member.id)).password, member.password)
})

test('member updates may omit password and TIVIA fields without clearing existing values', async () => {
  await Member.updateOne({ _id: member.id }, { tiviaMember: true })
  const payload = { ...fields, hometown: 'Helsinki' }
  delete payload.tiviaMember
  const response = await request('PUT', '/member/details', payload, member)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).success, true)
  const saved = await Member.findById(member.id)
  assert.equal(saved.tiviaMember, true)
  assert.equal(saved.password, member.password)
})

test('failed duplicate-email update returns an error and leaves member details intact', async () => {
  const response = await request(
    'PUT',
    '/member/details',
    {
      ...fields,
      email: admin.email,
      hometown: 'Helsinki',
      password: '',
      passwordAgain: '',
    },
    member
  )
  assert.equal(response.status, 409)
  assert.equal((await response.json()).success, false)
  const saved = await Member.findById(member.id)
  assert.equal(saved.email, fields.email)
  assert.equal(saved.hometown, fields.hometown)
})
