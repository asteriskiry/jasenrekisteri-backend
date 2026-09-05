'use strict'

const jwt = require('jsonwebtoken')
const config = require('../../../config/config')

const Member = require('../../models/Member')
const httpResponses = require('./')

const validator = require('validator')

async function loginUser(request, response) {
  let { email, password } = request.body

  // Validations

  if (!email || !password) {
    return response.json(httpResponses.onEmailOrPasswordEmpty)
  } else if (!validator.isEmail(request.body.email)) {
    return response.json(httpResponses.onValidationError)
  }

  // Find member

  try {
    const user = await Member.findOne({ email: email })
    if (!user) return response.json(httpResponses.onUserNotFound)
    const isMatch = await user.comparePassword(password)
    if (!isMatch) return response.json(httpResponses.onAuthenticationFail)

    const token = jwt.sign(user.toJSON(), config.secret, { expiresIn: '180d' })
    return response.json({
      success: true,
      role: user.role,
      id: user._id,
      token: 'JWT ' + token,
    })
  } catch {
    return response.status(503).json({
      success: false,
      message: 'Kirjautumispalvelu ei ole tällä hetkellä käytettävissä.',
    })
  }
}

// Compare passwords and send token

module.exports = {
  loginUser: loginUser,
}
