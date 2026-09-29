import { Strategy as JwtStrategy } from 'passport-jwt'
import Member from '../server/models/Member.js'
import LoginSession from '../server/models/LoginSession.js'
import config from './config.js'
import {
  credentialDigest,
  readSessionToken,
  validSessionClaims,
  SESSION_AUDIENCE,
  SESSION_ISSUER,
  SESSION_SECONDS,
} from '../server/services/authentication/session.js'

function setPassortConfigs(passport) {
  const opts: any = {}

  opts.jwtFromRequest = readSessionToken
  opts.secretOrKey = config.secret
  opts.algorithms = ['HS256']
  opts.issuer = SESSION_ISSUER
  opts.audience = SESSION_AUDIENCE
  opts.jsonWebTokenOptions = { maxAge: SESSION_SECONDS }
  opts.passReqToCallback = true
  passport.use(
    new JwtStrategy(opts, async (request, jwt_payload, done) => {
      try {
        if (!validSessionClaims(jwt_payload)) return done(null, false)
        const session = await LoginSession.findOne({
          _id: jwt_payload.jti,
          memberId: jwt_payload.sub,
          expiresAt: { $gt: new Date() },
        })
        if (!session) return done(null, false)
        const user = await Member.findById(jwt_payload.sub)
        if (!user || session.credentialDigest !== credentialDigest(user.password)) return done(null, false)
        request.authSession = session
        return done(null, user || false)
      } catch (error) {
        return done(error, false)
      }
    })
  )
}

export default setPassortConfigs
