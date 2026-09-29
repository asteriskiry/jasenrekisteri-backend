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
import { MongoMemoryReplSet } from 'mongodb-memory-server'

const logDirectory = await mkdtemp(join(tmpdir(), 'rekkari-member-tests-'))
process.env.SECRET = 'isolated-member-test-secret-at-least-32-characters'
process.env.LOGPATH = logDirectory
process.env.IMPORT_MODE = '0'
process.env.BOARDMAILADDRESS = 'board@example.test'
process.env.MAILSENDER = 'register@example.test'
const { default: Member } = await import('../dist/server/models/Member.js')
const { default: AdminAuditLog } = await import('../dist/server/models/AdminAuditLog.js')
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
  database = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '8.0.16' } })
  await mongoose.connect(database.getUri())
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()))
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
  // Direct collection access is only for resetting the isolated test database.
  await AdminAuditLog.collection.deleteMany({})
  sent.length = 0
  admin = await createMember({ firstName: 'Anna', lastName: 'Virtanen', role: 'Admin', email: 'admin@example.test' })
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
      currentPassword: 'original-password',
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

test('member and admin writes reject unsafe UTU accounts without saving or auditing them', async () => {
  for (const utuAccount of [
    '=1+1',
    '+SUM(A1)',
    '@test',
    'test;other',
    'test\nrow',
    'test\rrow',
    'test\trow',
    '＝1+1',
    'a'.repeat(31),
    123,
    {},
  ]) {
    const payload = { ...fields, utuAccount }
    for (const [method, path, actor, body] of [
      ['PUT', '/member/details', member, payload],
      ['PUT', '/admin/update', admin, { ...payload, memberID: member.id }],
      ['POST', '/admin/new', admin, { ...payload, email: 'new@example.test' }],
    ]) {
      const response = await request(method, path, body, actor)
      assert.equal(response.status, 400)
      assert.ok((await response.json()).error.details.utuAccount)
    }
  }
  assert.equal((await Member.findById(member.id)).utuAccount, '')
  assert.equal(await Member.countDocuments(), 2)
  assert.equal(await AdminAuditLog.countDocuments(), 0)
  const accepted = await request('PUT', '/member/details', { ...fields, utuAccount: 'Test.User12' }, member)
  assert.equal(accepted.status, 200)
  assert.equal((await Member.findById(member.id)).utuAccount, 'test.user12')
})

test('administrative creation records the authenticated actor and controlled persisted values', async () => {
  const response = await request('POST', '/admin/new', {
    ...fields,
    email: 'new@example.test',
    actorId: member.id,
    actorName: 'must-not-log',
    targetName: 'must-not-log',
    actorRole: 'Board',
    timestamp: '2000-01-01',
    password: 'must-not-log',
    token: 'must-not-log',
    secret: 'must-not-log',
    before: { injected: 'must-not-log' },
  })
  assert.equal(response.status, 200)
  const saved = await Member.findOne({ email: 'new@example.test' })
  const entry = await AdminAuditLog.findOne().lean()
  assert.equal(entry.actorId.toString(), admin.id)
  assert.equal(entry.actorName, 'Anna Virtanen')
  assert.equal(entry.actorRole, 'Admin')
  assert.equal(entry.targetId.toString(), saved.id)
  assert.equal(entry.targetName, 'Test Member')
  assert.equal(entry.action, 'member.created')
  assert.ok(Math.abs(Date.now() - entry.timestamp.getTime()) < 10000)
  assert.equal(entry.before, null)
  assert.equal(entry.after.email, saved.email)
  assert.equal(entry.after.membershipEnds, saved.membershipEnds.toISOString())
  assert.equal(entry.after.role, 'Member')
  assert.equal(entry.after.password, undefined)
  assert.ok(!JSON.stringify(entry).includes(saved.password))
  assert.ok(!JSON.stringify(entry).includes('must-not-log'))
})

test('admin updates audit role, access, approval, dates and password changes without credential values', async () => {
  const changes = {
    ...fields,
    memberID: member.id,
    role: 'Board',
    accessRights: true,
    accepted: true,
    membershipEnds: '2029-07-31T20:59:59.999Z',
    password: 'new-secret-password',
    passwordAgain: 'new-secret-password',
  }
  assert.equal((await request('PUT', '/admin/update', changes)).status, 200)
  const entry = await AdminAuditLog.findOne().lean()
  assert.equal(entry.action, 'member.updated')
  assert.equal(entry.before.role, 'Member')
  assert.equal(entry.after.role, 'Board')
  assert.equal(entry.before.accessRights, false)
  assert.equal(entry.after.accessRights, true)
  assert.equal(entry.before.accepted, false)
  assert.equal(entry.after.accepted, true)
  assert.equal(entry.before.membershipEnds, fields.membershipEnds)
  assert.equal(entry.after.membershipEnds, changes.membershipEnds)
  assert.deepEqual(entry.changedFields.sort(), ['accepted', 'accessRights', 'membershipEnds', 'role'])
  assert.equal(entry.passwordChanged, true)
  assert.equal(entry.before.email, undefined)
  assert.ok(!JSON.stringify(entry).includes('new-secret-password'))
  const saved = await Member.findById(member.id)
  assert.equal(await saved.comparePassword(changes.password), true)
  assert.ok(!JSON.stringify(entry).includes(saved.password))
  assert.ok(!JSON.stringify(entry).includes(member.password))
  assert.equal(sent.length, 1)
})

test('password-only admin updates are audited and no-op updates create no extra entries', async () => {
  assert.equal((await request('PUT', '/admin/update', { ...fields, memberID: member.id })).status, 200)
  assert.equal(await AdminAuditLog.countDocuments(), 0)
  assert.equal(
    (
      await request('PUT', '/admin/update', {
        ...fields,
        memberID: member.id,
        password: 'changed-password',
        passwordAgain: 'changed-password',
      })
    ).status,
    200
  )
  const entry = await AdminAuditLog.findOne().lean()
  assert.equal(entry.passwordChanged, true)
  assert.equal(entry.actorName, 'Anna Virtanen')
  assert.equal(entry.targetName, 'Test Member')
  assert.deepEqual(entry.changedFields, [])
  assert.deepEqual(entry.before, {})
  assert.deepEqual(entry.after, {})
})

test('board removal retains an audit snapshot and sends mail to the stored member address', async () => {
  const board = await createMember({
    firstName: 'Pekka',
    lastName: 'Laine',
    role: 'Board',
    email: 'board@example.test',
  })
  const response = await request('POST', '/admin/remove', { memberID: member.id, email: 'spoofed@example.test' }, board)
  assert.equal(response.status, 200)
  assert.equal(await Member.findById(member.id), null)
  const entry = await AdminAuditLog.findOne().lean()
  assert.equal(entry.action, 'member.deleted')
  assert.equal(entry.actorId.toString(), board.id)
  assert.equal(entry.actorName, 'Pekka Laine')
  assert.equal(entry.actorRole, 'Board')
  assert.equal(entry.targetId.toString(), member.id)
  assert.equal(entry.targetName, 'Test Member')
  assert.equal(entry.before.email, member.email)
  assert.equal(entry.after, null)
  assert.equal(entry.before.password, undefined)
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, member.email)
  assert.equal((await request('POST', '/admin/remove', { memberID: member.id }, board)).status, 404)
  assert.equal(await AdminAuditLog.countDocuments(), 1)
  assert.equal(sent.length, 1)
})

test('audit names retain their historical values after renames and deletion of both accounts', async () => {
  const reviewer = await createMember({ role: 'Admin', email: 'reviewer@example.test' })
  assert.equal(
    (await request('PUT', '/admin/update', { ...fields, memberID: member.id, firstName: 'Matti' })).status,
    200
  )
  const original = await AdminAuditLog.findOne().lean()
  assert.equal(original.actorName, 'Anna Virtanen')
  assert.equal(original.targetName, 'Test Member')
  assert.equal(original.before.firstName, 'Test')
  assert.equal(original.after.firstName, 'Matti')
  assert.equal(original.before.lastName, undefined)

  // The actor's own rename must also retain the name from before the change.
  assert.equal(
    (
      await request('PUT', '/admin/update', {
        ...fields,
        memberID: admin.id,
        email: admin.email,
        role: 'Admin',
        firstName: 'Anni',
        lastName: 'Virtanen',
      })
    ).status,
    200
  )
  const selfRename = await AdminAuditLog.findOne({ targetId: admin.id }).lean()
  assert.equal(selfRename.actorName, 'Anna Virtanen')
  assert.equal(selfRename.targetName, 'Anna Virtanen')
  assert.equal(selfRename.after.firstName, 'Anni')

  assert.equal((await request('POST', '/admin/remove', { memberID: member.id })).status, 200)
  assert.equal((await request('POST', '/admin/remove', { memberID: admin.id }, reviewer)).status, 200)
  const result = await (await request('GET', '/admin/audit', undefined, reviewer)).json()
  const historical = result.data.entries.find((entry) => entry._id === original._id.toString())
  assert.equal(historical.actorId, admin.id)
  assert.equal(historical.targetId, member.id)
  assert.equal(historical.actorName, 'Anna Virtanen')
  assert.equal(historical.targetName, 'Test Member')
  assert.equal(historical.actorNameSource, 'snapshot')
  assert.equal(historical.targetNameSource, 'snapshot')
  const deletion = result.data.entries.find(
    (entry) => entry.action === 'member.deleted' && entry.targetId === member.id
  )
  assert.equal(deletion.actorName, 'Anni Virtanen')
  assert.equal(deletion.targetName, 'Matti Member')
})

test('legacy audit names distinguish snapshots, current accounts and ID fallbacks without rewriting history', async () => {
  const missingActor = new mongoose.Types.ObjectId()
  const missingTarget = new mongoose.Types.ObjectId()
  const legacy = [
    {
      _id: new mongoose.Types.ObjectId(),
      actorId: admin._id,
      targetId: member._id,
      action: 'member.updated',
      before: { hometown: 'Turku' },
      after: { hometown: 'Helsinki' },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      actorId: missingActor,
      targetId: missingTarget,
      action: 'member.deleted',
      before: { firstName: 'Former', lastName: 'Member' },
      after: null,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      actorId: missingActor,
      targetId: missingTarget,
      action: 'member.updated',
      before: { firstName: 'Former' },
      after: { firstName: 'Later' },
    },
  ].map((entry) => ({ ...entry, actorRole: 'Admin', timestamp: new Date(), changedFields: [], passwordChanged: false }))
  // Raw insertion reproduces records written before name snapshots were introduced.
  await AdminAuditLog.collection.insertMany(legacy)
  await Member.updateOne({ _id: member.id }, { firstName: 'Current' })
  const result = await (await request('GET', '/admin/audit')).json()
  const byId = new Map(result.data.entries.map((entry) => [entry._id, entry]))
  const current = byId.get(legacy[0]._id.toString())
  assert.equal(current.actorName, 'Anna Virtanen')
  assert.equal(current.targetName, 'Current Member')
  assert.equal(current.actorNameSource, 'current')
  assert.equal(current.targetNameSource, 'current')
  assert.equal(current.password, undefined)
  assert.equal(current.email, undefined)
  const deleted = byId.get(legacy[1]._id.toString())
  assert.equal(deleted.actorName, missingActor.toString())
  assert.equal(deleted.actorNameSource, 'id')
  assert.equal(deleted.targetName, 'Former Member')
  assert.equal(deleted.targetNameSource, 'snapshot')
  const partial = byId.get(legacy[2]._id.toString())
  assert.equal(partial.targetName, missingTarget.toString())
  assert.equal(partial.targetNameSource, 'id')
  for (const original of legacy) {
    assert.deepEqual(await AdminAuditLog.collection.findOne({ _id: original._id }), original)
  }
})

test('audit failure rolls back creation, update and deletion and sends no notification', async () => {
  const injected = mock.method(AdminAuditLog.collection, 'insertOne', async () => {
    throw new Error('Injected audit storage failure')
  })
  try {
    const responses = []
    responses.push(await request('POST', '/admin/new', { ...fields, email: 'new@example.test' }))
    responses.push(
      await request('PUT', '/admin/update', { ...fields, memberID: member.id, accepted: true, role: 'Admin' })
    )
    responses.push(await request('POST', '/admin/remove', { memberID: member.id }))
    assert.ok(responses.every((response) => response.status === 500))
    assert.equal(injected.mock.callCount(), 3)
    assert.equal(await Member.countDocuments(), 2)
    const saved = await Member.findById(member.id)
    assert.equal(saved.accepted, false)
    assert.equal(saved.role, 'Member')
    assert.equal(await AdminAuditLog.countDocuments(), 0)
    assert.equal(sent.length, 0)
  } finally {
    injected.mock.restore()
  }
})

test('a transient audit write retries the transaction without duplicate members, entries or mail', async () => {
  const original = AdminAuditLog.collection.insertOne
  let attempts = 0
  const injected = mock.method(AdminAuditLog.collection, 'insertOne', async function (...args) {
    attempts += 1
    if (attempts === 1)
      throw new mongoose.mongo.MongoServerError({
        message: 'Injected transient audit failure',
        code: 112,
        errorLabels: ['TransientTransactionError'],
      })
    return original.apply(this, args)
  })
  try {
    const response = await request('POST', '/admin/new', { ...fields, email: 'retry@example.test' })
    assert.equal(response.status, 200)
    assert.equal(attempts, 2)
    assert.equal(await Member.countDocuments({ email: 'retry@example.test' }), 1)
    assert.equal(await AdminAuditLog.countDocuments(), 1)
    assert.equal(sent.length, 2)
  } finally {
    injected.mock.restore()
  }
})

test('failed and unauthorized writes never produce successful audit entries', async () => {
  assert.equal((await request('POST', '/admin/new', { ...fields, email: admin.email })).status, 409)
  assert.equal(
    (await request('PUT', '/admin/update', { ...fields, memberID: member.id, email: admin.email })).status,
    409
  )
  assert.equal((await request('POST', '/admin/remove', { memberID: { $ne: null } })).status, 400)
  assert.equal((await request('POST', '/admin/new', { ...fields, email: 'new@example.test' }, member)).status, 403)
  assert.equal((await request('POST', '/admin/remove', { memberID: admin.id }, member)).status, 403)
  assert.equal(await AdminAuditLog.countDocuments(), 0)
  assert.equal(await Member.countDocuments(), 2)
  assert.equal(sent.length, 0)
})

test('audit log is admin-only, paginated, filterable and rejects malformed filters', async () => {
  for (const hometown of ['Helsinki', 'Tampere', 'Turku']) {
    assert.equal((await request('PUT', '/admin/update', { ...fields, memberID: member.id, hometown })).status, 200)
  }
  const board = await createMember({ role: 'Board', email: 'board@example.test' })
  for (const [actor, expected] of [
    [member, 403],
    [board, 403],
    [null, 401],
  ]) {
    assert.equal((await request('GET', '/admin/audit', undefined, actor)).status, expected)
  }
  const firstResponse = await request('GET', `/admin/audit?limit=2&targetId=${member.id}&actorId=${admin.id}`)
  assert.equal(firstResponse.headers.get('cache-control'), 'no-store')
  const first = (await firstResponse.json()).data
  assert.equal(first.entries.length, 2)
  assert.ok(first.entries.every((entry) => entry.actorName === 'Anna Virtanen' && entry.targetName === 'Test Member'))
  assert.ok(first.nextCursor)
  const second = (await (await request('GET', `/admin/audit?limit=2&before=${first.nextCursor}`)).json()).data
  assert.equal(second.entries.length, 1)
  assert.equal(second.nextCursor, null)
  assert.equal(new Set([...first.entries, ...second.entries].map((entry) => entry._id)).size, 3)
  assert.equal((await (await request('GET', `/admin/audit?targetId=${admin.id}`)).json()).data.entries.length, 0)
  for (const query of [
    'limit=0',
    'limit=101',
    'limit=1.5',
    'limit[]=2',
    'before=bad',
    'targetId=bad',
    'actorId[$ne]=x',
  ]) {
    assert.equal((await request('GET', '/admin/audit?' + query)).status, 400)
  }
})

test('audit entries reject model/document modifications and deletion', async () => {
  await request('PUT', '/admin/update', { ...fields, memberID: member.id, hometown: 'Helsinki' })
  const entry = await AdminAuditLog.findOne()
  const filter = { _id: entry._id }
  const mutation = { $set: { actorRole: 'Board' } }
  for (const change of [
    () => AdminAuditLog.updateOne(filter, mutation),
    () => AdminAuditLog.updateMany(filter, mutation),
    () => AdminAuditLog.findOneAndUpdate(filter, mutation),
    () => AdminAuditLog.replaceOne(filter, entry.toObject()),
    () => AdminAuditLog.findOneAndReplace(filter, entry.toObject()),
    () => AdminAuditLog.deleteOne(filter),
    () => AdminAuditLog.deleteMany(filter),
    () => AdminAuditLog.findOneAndDelete(filter),
    () => AdminAuditLog.bulkWrite([{ deleteOne: { filter } }]),
    () => entry.deleteOne(),
    () => {
      entry.actorRole = 'Board'
      return entry.save()
    },
  ])
    await assert.rejects(async () => change(), /append-only/)
  assert.equal(await AdminAuditLog.countDocuments(), 1)
  assert.equal((await AdminAuditLog.findById(entry.id)).actorRole, 'Admin')
})
