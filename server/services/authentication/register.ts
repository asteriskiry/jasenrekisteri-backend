'use strict'

import TempMember from '../../models/TempMember.js'
import Member from '../../models/Member.js'
import httpResponses from './index.js'
import formatters from '../../utils/formatters.js'
import { validatePersonFields } from '../../validators/common.js'
import { success } from '../../utils/responses.js'
import jwt from 'jsonwebtoken'
import config from '../../../config/config.js'

async function registerUser(request, response) {
  let { firstName, lastName, utuAccount, email, hometown, tyyMember } = request.body

  const errors = validatePersonFields(request.body)
  if (Object.keys(errors).length > 0) {
    return response
      .status(400)
      .json({
        ...httpResponses.onValidationError,
        error: { ...httpResponses.onValidationError.error, details: errors },
      })
  }

  const member = await Member.findOne({ email: email })
  if (member) {
    return response.status(409).json(httpResponses.onUserSaveError)
  }

  const newTempMember = new TempMember()
  newTempMember.firstName = formatters.capitalizeFirstLetter(firstName)
  newTempMember.lastName = formatters.capitalizeFirstLetter(lastName)
  newTempMember.utuAccount = utuAccount ? utuAccount.toLowerCase() : ''
  newTempMember.email = email.toLowerCase()
  newTempMember.hometown = formatters.capitalizeFirstLetter(hometown)
  newTempMember.tyyMember = !!tyyMember
  newTempMember.tiviaMember = false

  await newTempMember.save()
  return response.json(
    success('Käyttäjätunnus luotu onnistuneesti.', {
      memberId: newTempMember._id,
      paymentToken: jwt.sign({ sub: newTempMember._id.toString(), purpose: 'registration-payment' }, config.secret, {
        expiresIn: '1h',
        audience: 'checkout',
      }),
    })
  )
}

export default {
  registerUser: registerUser,
}
