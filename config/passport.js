let JwtStrategy = require('passport-jwt').Strategy
let ExtractJwt = require('passport-jwt').ExtractJwt
let Member = require('../server/models/Member')
let config = require('./config')

function setPassortConfigs(passport) {
  let opts = {}

  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt')
  opts.secretOrKey = config.secret
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await Member.findOne({ _id: jwt_payload._id })
        return done(null, user || false)
      } catch (error) {
        return done(error, false)
      }
    })
  )
}

module.exports = setPassortConfigs
