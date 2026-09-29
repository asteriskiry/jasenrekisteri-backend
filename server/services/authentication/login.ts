'use strict'

import {
  createSession,
  revokeSession,
  sessionData,
  sessionCookieOptions,
  clearLegacyCookies,
  SESSION_COOKIE,
} from './session.js'

import Member from '../../models/Member.js'
import httpResponses from './index.js'

import { validateEmail } from '../../validators/common.js'
import { success } from '../../utils/responses.js'
import bcrypt from 'bcrypt'
import { normalizedEmail } from '../../utils/authLimits.js'

const dummyHash = bcrypt.hashSync('invalid-login-placeholder', 10)

async function loginUser(request, response, next) {
  let { email, password } = request.body

  if (!email || typeof password !== 'string' || !password) {
    return response.status(400).json(httpResponses.onEmailOrPasswordEmpty)
  } else if (Object.keys(validateEmail(request.body)).length > 0) {
    return response.status(400).json(httpResponses.onValidationError)
  }

  // Find member

  try {
    const user = await Member.findOne({ email: normalizedEmail(email) })
    const isMatch = await bcrypt.compare(password, user?.password || dummyHash)
    if (!user || !isMatch) return response.status(401).json(httpResponses.onAuthenticationFail)

    await revokeSession(request)
    const session = await createSession(user)
    response.cookie(SESSION_COOKIE, session.token, {
      ...sessionCookieOptions(),
      expires: session.expiresAt,
      maxAge: session.expiresAt.getTime() - Date.now(),
    })
    clearLegacyCookies(response)
    return response.json(success('Kirjautuminen onnistui.', sessionData(user, session.expiresAt)))
  } catch (error) {
    return next(error)
  }
}

// Compare passwords and send token

export default {
  loginUser: loginUser,
}
