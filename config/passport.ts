import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import Member from '../server/models/Member.js'
import config from './config.js'

function setPassortConfigs(passport) {
  const opts: any = {}

  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt')
  opts.secretOrKey = config.secret
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await Member.findOne({ id: jwt_payload.id })
        return done(null, user || false)
      } catch (error) {
        return done(error, false)
      }
    })
  )
}

export default setPassortConfigs
