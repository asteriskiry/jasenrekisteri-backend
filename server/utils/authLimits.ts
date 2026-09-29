import { createHmac } from 'node:crypto'
import config from '../../config/config.js'
import AbuseBucket from '../models/AbuseBucket.js'
import { failure, success } from './responses.js'

export const recoveryAccepted = success('Jos osoite löytyy rekisteristä, saat ohjeet sähköpostiisi.')
export const normalizedEmail = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '')
export const privateKey = (scope: string, value: string) =>
  createHmac('sha256', config.secret).update(`${scope}:${value}`).digest('hex')

// MongoDB owns the counters, so workers and restarts share the same limits.
export function authLimit(
  scope: string,
  max: number,
  windowMs: number,
  key = (request) => request.ip,
  silentResponse = null
) {
  return async (request, response, next) => {
    try {
      const now = Date.now()
      const window = Math.floor(now / windowMs)
      const expiresAt = new Date((window + 1) * windowMs)
      const id = privateKey(scope, `${key(request)}:${window}`)
      let bucket
      try {
        bucket = await AbuseBucket.findOneAndUpdate(
          { _id: id },
          { $inc: { hits: 1 }, $setOnInsert: { expiresAt } },
          { upsert: true, returnDocument: 'after' }
        )
      } catch (error) {
        if (error.code !== 11000) throw error
        bucket = await AbuseBucket.findOneAndUpdate({ _id: id }, { $inc: { hits: 1 } }, { returnDocument: 'after' })
      }
      if (bucket.hits <= max) return next()
      if (silentResponse) return response.status(202).json(silentResponse)
      response.set('Retry-After', String(Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000))))
      return response.status(429).json(failure('RATE_LIMIT_EXCEEDED', 'Liikaa pyyntöjä. Yritä myöhemmin uudelleen.'))
    } catch (error) {
      return next(error)
    }
  }
}

export const emailKey = (request) => normalizedEmail(request.body?.email)
export const memberKey = (request) => String(request.user?._id || request.body?.userID || '')
