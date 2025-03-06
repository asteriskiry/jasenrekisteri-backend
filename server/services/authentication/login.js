'use strict'

const jwt = require('jsonwebtoken')
const config = require('../../../config/config')

const Member = require('../../models/Member')
const httpResponses = require('./')

const validator = require('validator')

let http, userPassword

function loginUser(request, response) {
  let { email, password } = request.body

  // Validations

  if (!email || !password) {
    return response.json(httpResponses.onEmailOrPasswordEmpty)
  } else if (
    !validator.isEmail(request.body.email)
  ){
    return response.json(httpResponses.onValidationError)
  }

  // Find member

  Member.findOne(
    {
      email: email,
    },
    function(error, user) {
      if (error) return response.json(error)
      if (!user) return response.json(httpResponses.onUserNotFound)
      userPassword = password
      http = response
      comparePassword(user)
    }
  )
}

// Compare passwords and send token

function comparePassword(user) {
  let responseToken

  user.comparePassword(userPassword, function(error, isMatch) {
    if (error) return http.json(error)
    if (isMatch && !error) {
      var token = jwt.sign(user.toJSON(), config.secret, {
        expiresIn: '180d',
      })

      if (user != null) {
        responseToken = {
          success: true,
          role: user.role,
          id: user._id,
          token: 'JWT ' + token,
        }
      }

      return http.json(responseToken)
    }

    return http.json(httpResponses.onAuthenticationFail)
  })
}

module.exports = {
  loginUser: loginUser,
}
