import { createHmac, randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import config from '../../../config/config.js'
import LoginSession from '../../models/LoginSession.js'
import { success } from '../../utils/responses.js'

export const SESSION_SECONDS = 8 * 60 * 60
export const SESSION_ISSUER = 'jasenrekisteri'
export const SESSION_AUDIENCE = 'member-session'
export const SESSION_COOKIE = config.env === 'production' ? '__Host-jasenrekisteri-session' : 'jasenrekisteri-session'

export function credentialDigest(passwordHash: string) {
  return createHmac('sha256', config.secret).update(passwordHash).digest('hex')
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.env === 'production' || new URL(config.clientUrl).protocol === 'https:',
    sameSite: 'lax' as const,
    path: '/',
  }
}

export function readSessionToken(request) {
  const token = request.cookies?.[SESSION_COOKIE]
  return typeof token === 'string' ? token : null
}

export function validSessionClaims(payload) {
  return (
    payload.purpose === 'session' &&
    typeof payload.sub === 'string' &&
    /^[a-f\d]{24}$/i.test(payload.sub) &&
    typeof payload.jti === 'string' &&
    /^[a-f\d-]{36}$/i.test(payload.jti) &&
    Number.isInteger(payload.iat) &&
    Number.isInteger(payload.exp) &&
    payload.iat <= Math.floor(Date.now() / 1000) &&
    payload.exp > payload.iat &&
    payload.exp - payload.iat <= SESSION_SECONDS
  )
}

export async function revokeSession(request) {
  const token = readSessionToken(request)
  if (!token) return
  let payload
  try {
    payload = jwt.verify(token, config.secret, {
      algorithms: ['HS256'],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    })
  } catch {
    return
  }
  if (validSessionClaims(payload)) await LoginSession.deleteOne({ _id: payload.jti, memberId: payload.sub })
}

export async function createSession(member) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = new Date((issuedAt + SESSION_SECONDS) * 1000)
  const id = randomUUID()
  const token = jwt.sign({ sub: member.id, jti: id, purpose: 'session', iat: issuedAt }, config.secret, {
    algorithm: 'HS256',
    issuer: SESSION_ISSUER,
    audience: SESSION_AUDIENCE,
    expiresIn: SESSION_SECONDS,
  })
  await LoginSession.create({
    _id: id,
    memberId: member._id,
    credentialDigest: credentialDigest(member.password),
    expiresAt,
  })
  return { token, expiresAt }
}

export function clearLegacyCookies(response) {
  for (const name of ['jasenrekisteri-token', 'role', 'id']) response.clearCookie(name, { path: '/' })
}

export function sessionData(member, expiresAt) {
  return { id: member.id, role: member.role, expiresAt: new Date(expiresAt).toISOString() }
}

export function getSession(request, response) {
  clearLegacyCookies(response)
  return response.json(success('Kirjautuminen on voimassa.', sessionData(request.user, request.authSession.expiresAt)))
}

export async function logout(request, response, next) {
  try {
    await revokeSession(request)
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions())
    clearLegacyCookies(response)
    return response.json(success('Olet kirjautunut ulos.'))
  } catch (error) {
    return next(error)
  }
}
