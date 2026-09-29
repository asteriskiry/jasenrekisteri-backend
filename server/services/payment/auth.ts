import jwt from 'jsonwebtoken'
import passport from 'passport'
import config from '../../../config/config.js'
import TempMember from '../../models/TempMember.js'
import { failure } from '../../utils/responses.js'

export async function authenticatePayment(request, response, next) {
  if (!request.body.paymentToken) return passport.authenticate('jwt', { session: false })(request, response, next)
  try {
    const token = jwt.verify(request.body.paymentToken, config.secret, { audience: 'checkout', algorithms: ['HS256'] })
    if (typeof token === 'string' || token.purpose !== 'registration-payment') throw new Error('Invalid scope')
    const member = await TempMember.findById(token.sub)
    if (!member) return response.status(401).json(failure('UNAUTHORIZED', 'Rekisteröidy uudelleen.'))
    request.user = member
    next()
  } catch {
    return response.status(401).json(failure('UNAUTHORIZED', 'Maksulupa on vanhentunut. Rekisteröidy uudelleen.'))
  }
}
