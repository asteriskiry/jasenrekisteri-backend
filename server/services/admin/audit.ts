import mongoose from 'mongoose'
import AdminAuditLog, { AUDIT_ACTIONS, AUDIT_FIELDS } from '../../models/AdminAuditLog.js'
import Member from '../../models/Member.js'
import { failure, success } from '../../utils/responses.js'
import { ApiError } from '../../utils/errors.js'

type AuditValues = Record<string, string | boolean | null>

function fullName(person: { firstName?: unknown; lastName?: unknown } | null | undefined): string | null {
  if (typeof person?.firstName !== 'string' || typeof person?.lastName !== 'string') return null
  const firstName = person.firstName.trim()
  const lastName = person.lastName.trim()
  return firstName && lastName ? `${firstName} ${lastName}` : null
}

export function memberAuditValues(member): AuditValues {
  return Object.fromEntries(
    AUDIT_FIELDS.map((field) => {
      const value = member[field]
      return [field, value instanceof Date ? value.toISOString() : (value ?? null)]
    })
  )
}

export async function appendMemberAudit({
  actor,
  targetId,
  action,
  before = null,
  after = null,
  passwordChanged = false,
  session,
}: {
  actor: { _id: mongoose.Types.ObjectId; role: string; firstName: string; lastName: string }
  targetId: mongoose.Types.ObjectId
  action: (typeof AUDIT_ACTIONS)[number]
  before?: AuditValues | null
  after?: AuditValues | null
  passwordChanged?: boolean
  session: mongoose.ClientSession
}) {
  if (!session?.inTransaction()) throw new Error('Administrative audit writes require a transaction.')
  if (actor.role !== 'Admin' && actor.role !== 'Board')
    throw new ApiError(403, 'FORBIDDEN', 'Administrative role required.')
  const changedFields = AUDIT_FIELDS.filter((field) => before?.[field] !== after?.[field])
  if (action === 'member.updated' && !changedFields.length && !passwordChanged) return
  const controlledValues = (values: AuditValues | null) =>
    values && Object.fromEntries(changedFields.map((field) => [field, values[field]]))
  await AdminAuditLog.create(
    [
      {
        actorId: actor._id,
        actorName: fullName(actor),
        actorRole: actor.role,
        targetId,
        // Use the original name for edits/deletions, and the saved name for creation.
        targetName: fullName(before ?? after),
        action,
        before: controlledValues(before),
        after: controlledValues(after),
        changedFields,
        passwordChanged,
      },
    ],
    { session }
  )
}

export async function listAudit(request, response) {
  if (request.user.role !== 'Admin') {
    return response.status(403).json(failure('FORBIDDEN', 'Vain ylläpitäjä voi lukea muutoslokin.'))
  }
  if (Object.keys(request.query).some((key) => !['actorId', 'targetId', 'before', 'limit'].includes(key))) {
    return response.status(400).json(failure('INVALID_FILTER', 'Virheellinen lokin hakuehto.'))
  }
  const filter: mongoose.QueryFilter<unknown> = {}
  for (const key of ['actorId', 'targetId', 'before']) {
    const value = request.query[key]
    if (value === undefined) continue
    if (typeof value !== 'string' || !mongoose.isObjectIdOrHexString(value)) {
      return response.status(400).json(failure('INVALID_FILTER', 'Virheellinen lokin hakuehto.'))
    }
    if (key === 'before') filter._id = { $lt: new mongoose.Types.ObjectId(value) }
    else filter[key] = new mongoose.Types.ObjectId(value)
  }
  const rawLimit = request.query.limit
  if (
    rawLimit !== undefined &&
    (typeof rawLimit !== 'string' || !/^[1-9]\d{0,2}$/.test(rawLimit) || Number(rawLimit) > 100)
  ) {
    return response.status(400).json(failure('INVALID_LIMIT', 'Sivukoon on oltava 1–100.'))
  }
  const limit = rawLimit === undefined ? 50 : Number(rawLimit)
  const entries = await AdminAuditLog.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean()
  const hasMore = entries.length > limit
  const page = entries.slice(0, limit)
  const snapshots = page.map((entry) => ({
    actorName: entry.actorName,
    targetName: entry.targetName || fullName(entry.action === 'member.created' ? entry.after : entry.before),
  }))
  // Resolve legacy entries in one projected query; never rewrite the append-only history.
  const missingIds = new Set<string>()
  page.forEach((entry, index) => {
    if (!snapshots[index].actorName) missingIds.add(entry.actorId.toString())
    if (!snapshots[index].targetName) missingIds.add(entry.targetId.toString())
  })
  const members = missingIds.size
    ? await Member.find({ _id: { $in: [...missingIds] } })
        .select('_id firstName lastName')
        .lean()
    : []
  const currentNames = new Map(members.map((member) => [member._id.toString(), fullName(member)]))
  const resolveName = (snapshot: string | null | undefined, id: mongoose.Types.ObjectId) => {
    if (snapshot) return { name: snapshot, source: 'snapshot' }
    const current = currentNames.get(id.toString())
    return current ? { name: current, source: 'current' } : { name: id.toString(), source: 'id' }
  }
  const namedEntries = page.map((entry, index) => {
    const actor = resolveName(snapshots[index].actorName, entry.actorId)
    const target = resolveName(snapshots[index].targetName, entry.targetId)
    return {
      ...entry,
      actorName: actor.name,
      actorNameSource: actor.source,
      targetName: target.name,
      targetNameSource: target.source,
    }
  })
  response.set('Cache-Control', 'no-store')
  return response.json(
    success('Muutosloki.', {
      entries: namedEntries,
      nextCursor: hasMore ? page[page.length - 1]._id.toString() : null,
    })
  )
}
