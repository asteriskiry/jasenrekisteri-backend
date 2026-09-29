import mongoose from 'mongoose'

// Only these member fields can enter the audit trail. Never store request bodies or credentials.
const valuesSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    utuAccount: String,
    email: String,
    hometown: String,
    tyyMember: Boolean,
    tiviaMember: Boolean,
    role: String,
    accessRights: Boolean,
    membershipStarts: String,
    membershipEnds: String,
    accountCreated: String,
    accepted: Boolean,
  },
  { _id: false, versionKey: false, strict: 'throw', minimize: false }
)

export const AUDIT_FIELDS = Object.keys(valuesSchema.paths)
export const AUDIT_ACTIONS = ['member.created', 'member.updated', 'member.deleted'] as const

const auditSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorName: { type: String, required: true, trim: true },
    actorRole: { type: String, enum: ['Admin', 'Board'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetName: { type: String, required: true, trim: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    timestamp: { type: Date, default: Date.now, required: true },
    before: { type: valuesSchema, default: null },
    after: { type: valuesSchema, default: null },
    changedFields: [{ type: String, enum: AUDIT_FIELDS }],
    passwordChanged: { type: Boolean, default: false },
  },
  { collection: 'adminauditlogs', strict: 'throw', versionKey: false, minimize: false }
)

auditSchema.index({ targetId: 1, _id: -1 })
auditSchema.index({ actorId: 1, _id: -1 })

function rejectMutation() {
  throw new Error('Administrative audit entries are append-only.')
}

auditSchema.pre('save', function () {
  if (!this.isNew) rejectMutation()
})
auditSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteMany', 'findOneAndDelete'],
  rejectMutation
)
auditSchema.pre('deleteOne', { document: true, query: true }, rejectMutation)
auditSchema.pre('bulkWrite', rejectMutation)

export default mongoose.model('AdminAuditLog', auditSchema)
