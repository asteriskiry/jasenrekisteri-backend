import Member from '../../models/Member.js'
import httpResponses from './index.js'
import formatters from '../../utils/formatters.js'
import { validatePassword, validatePersonFields } from '../../validators/common.js'
import mongoose from 'mongoose'
import { randomBytes } from 'node:crypto'
import config from '../../../config/config.js'
import EmailChange from '../../models/EmailChange.js'
import ResetPassword from '../../models/ResetPassword.js'
import { credentialDigest } from '../authentication/session.js'
import { emailTokenHash } from './email.js'
import { failure, success } from '../../utils/responses.js'
import { normalizedEmail } from '../../utils/authLimits.js'
import { sendSecurityMail } from '../../utils/securityMail.js'
import { ApiError } from '../../utils/errors.js'

async function fetchDetails(request, response) {
  const memberID = request.user._id

  try {
    const doc = await Member.findOne({ _id: memberID })
    if (!doc) return response.json({ memberNotFound: true })
    const member = doc.toObject()

    delete member.password

    return response.json(member)
  } catch (error) {
    return response.json(error)
  }
}

async function updateDetails(request, response) {
  const errors = {
    ...validatePersonFields(request.body),
    ...validatePassword(request.body),
  }
  if (request.body.tiviaMember !== undefined && typeof request.body.tiviaMember !== 'boolean') {
    errors.tiviaMember = 'Tivia membership must be a boolean.'
  }
  if (Object.keys(errors).length > 0) {
    return response.status(400).json({
      ...httpResponses.onValidationError,
      error: { ...httpResponses.onValidationError.error, details: errors },
    })
  }

  const email = normalizedEmail(request.body.email)
  const changingEmail = email !== request.user.email
  const changingPassword = !!request.body.password
  if (
    (changingEmail || changingPassword) &&
    (typeof request.body.currentPassword !== 'string' ||
      !(await request.user.comparePassword(request.body.currentPassword)))
  ) {
    return response.status(403).json(failure('REAUTHENTICATION_REQUIRED', 'Vahvista muutos nykyisellä salasanallasi.'))
  }
  let record = {
    firstName: formatters.capitalizeFirstLetter(request.body.firstName),
    lastName: formatters.capitalizeFirstLetter(request.body.lastName),
    utuAccount: request.body.utuAccount ? request.body.utuAccount.toLowerCase() : '',
    hometown: formatters.capitalizeFirstLetter(request.body.hometown),
    tyyMember: request.body.tyyMember,
    ...(request.body.tiviaMember === undefined ? {} : { tiviaMember: request.body.tiviaMember }),
    password: request.body.password,
  }

  if (request.body.password === '' || request.body.password == null) {
    delete record.password
  } else if (request.body.password.length < 6) {
    return response.json(httpResponses.onTooShortPassword)
  }

  const token = changingEmail ? randomBytes(32).toString('hex') : null
  await mongoose.connection.transaction(async (session) => {
    const member = await Member.findById(request.user._id).session(session)
    if (!member || member.password !== request.user.password || member.email !== request.user.email)
      throw new ApiError(409, 'PROFILE_CHANGED', 'Tiedot muuttuivat. Kirjaudu uudelleen.')
    if (member.accepted && record.utuAccount !== (member.utuAccount || ''))
      throw new ApiError(
        403,
        'UTU_APPROVAL_REQUIRED',
        'Hyväksytyn UTU-tunnuksen voi vaihtaa vain ylläpitäjä. Ota yhteyttä hallitukseen.'
      )
    // Check uniqueness while leaving the current login/recovery address unchanged.
    if (changingEmail && (await Member.exists({ email, _id: { $ne: member._id } }).session(session)))
      throw new ApiError(409, 'DUPLICATE_RESOURCE', 'Sähköpostiosoitetta ei voi käyttää.')
    member.set(record)
    await member.save({ session })
    if (changingPassword) {
      await ResetPassword.deleteMany({ userID: member.id }).session(session)
      await EmailChange.deleteOne({ _id: member._id }).session(session)
    }
    if (changingEmail)
      await EmailChange.findOneAndUpdate(
        { _id: member._id },
        {
          email,
          tokenHash: emailTokenHash(token),
          credentialDigest: credentialDigest(member.password),
          expiresAt: new Date(Date.now() + 3600_000),
        },
        { upsert: true, session }
      )
  })
  if (changingEmail) {
    try {
      await sendSecurityMail(
        email,
        'Vahvista uusi sähköpostiosoitteesi',
        `Vahvista uusi sähköpostiosoite kirjautuneena jäsenrekisteriin:\n${config.clientUrl.replace(/\/$/, '')}/member/email/confirm/${token}\nLinkki on voimassa tunnin. Nykyinen osoitteesi säilyy vahvistukseen asti.`
      )
    } catch {
      // Profile/password changes have committed; do not falsely report that they failed.
      return response.json(
        success(
          'Tiedot tallennettu, mutta vahvistusviestin lähetys epäonnistui. Nykyinen sähköpostiosoite säilyy. Yritä osoitteen vaihtoa uudelleen.',
          { verificationMailSent: false }
        )
      )
    }
    return response.json(
      success(
        'Tiedot tallennettu. Vahvista uusi sähköpostiosoite siihen lähetetystä linkistä. Nykyinen osoite säilyy vahvistukseen asti.'
      )
    )
  }
  return response.json(httpResponses.onUpdateSuccess)
}

export default {
  fetchDetails: fetchDetails,
  updateDetails: updateDetails,
}
