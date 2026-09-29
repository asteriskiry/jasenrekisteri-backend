import TempMember from '../../models/TempMember.js'
import Member from '../../models/Member.js'
import httpResponses from './index.js'
import formatters from '../../utils/formatters.js'
import { validatePersonFields } from '../../validators/common.js'
import { success } from '../../utils/responses.js'
import jwt from 'jsonwebtoken'
import config from '../../../config/config.js'
import { normalizedEmail, privateKey } from '../../utils/authLimits.js'

export function validateRegistrationRequest(request, response, next) {
  const errors = validatePersonFields(request.body || {})
  if (Object.keys(errors).length)
    return response.status(400).json({
      ...httpResponses.onValidationError,
      error: { ...httpResponses.onValidationError.error, details: errors },
    })
  return next()
}

async function registerUser(request, response) {
  return validateRegistrationRequest(request, response, async () => {
    const { firstName, lastName, utuAccount, hometown, tyyMember } = request.body
    const email = normalizedEmail(request.body.email)
    if (await Member.exists({ email })) return response.status(409).json(httpResponses.onUserSaveError)

    const details = {
      firstName: formatters.capitalizeFirstLetter(firstName),
      lastName: formatters.capitalizeFirstLetter(lastName),
      utuAccount: utuAccount ? utuAccount.toLowerCase() : '',
      email,
      hometown: formatters.capitalizeFirstLetter(hometown),
      tyyMember,
      tiviaMember: false,
    }
    // Reuse identical retries, but never substitute another submission's details
    // just because it used the same email address. Payment snapshots stay immutable.
    const registrationKey = privateKey('pending-registration', JSON.stringify(details))
    await TempMember.deleteOne({ registrationKey, expiresAt: { $lte: new Date() } })
    let pending
    try {
      pending = await TempMember.findOneAndUpdate(
        { registrationKey },
        { $setOnInsert: { ...details, expiresAt: new Date(Date.now() + 24 * 3600_000) } },
        { upsert: true, returnDocument: 'after', runValidators: true }
      )
    } catch (error) {
      if (error.code !== 11000) throw error
      pending = await TempMember.findOne({ registrationKey })
    }
    return response.json(
      success('Käyttäjätunnus luotu onnistuneesti.', {
        memberId: pending.id,
        paymentToken: jwt.sign({ sub: pending.id, purpose: 'registration-payment' }, config.secret, {
          expiresIn: '1h',
          audience: 'checkout',
        }),
      })
    )
  })
}

export default { registerUser }
