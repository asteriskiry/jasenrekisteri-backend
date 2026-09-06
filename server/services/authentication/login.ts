'use strict'

import jwt from 'jsonwebtoken'
import config from '../../../config/config.js'

import Member from '../../models/Member.js'
import httpResponses from './index.js'

import { validateEmail } from '../../validators/common.js'
import { success } from '../../utils/responses.js'

async function loginUser(request, response) {
  let { email, password } = request.body

  if (!email || !password) {
    return response.status(400).json(httpResponses.onEmailOrPasswordEmpty)
  } else if (Object.keys(validateEmail(request.body)).length > 0) {
    return response.status(400).json(httpResponses.onValidationError)
  }

  // Find member

  try {
    const user = await Member.findOne({ email: email })
    if (!user) return response.status(401).json(httpResponses.onUserNotFound)
    const isMatch = await user.comparePassword(password)
    if (!isMatch) return response.status(401).json(httpResponses.onAuthenticationFail)

    const token = jwt.sign(user.toJSON(), config.secret, { expiresIn: '180d' })
    return response.json(
      success('Kirjautuminen onnistui.', {
        role: user.role,
        id: user._id,
        token: 'JWT ' + token,
      })
    )
  } catch {
    return response.status(503).json({
      success: false,
      message: 'Kirjautumispalvelu ei ole tällä hetkellä käytettävissä.',
    })
  }
}

// Compare passwords and send token

export default {
  loginUser: loginUser,
}
