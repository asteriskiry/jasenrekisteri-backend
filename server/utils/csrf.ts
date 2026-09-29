import config from '../../config/config.js'
import { failure } from './responses.js'

// A custom header prevents simple cross-origin form requests. CORS grants
// credentialed access only to CLIENTURL; also reject a supplied foreign origin.
export function protectBrowserWrites(request, response, next) {
  if (
    ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ||
    (request.method === 'POST' && /^\/pay\/webhook\/?$/i.test(request.path))
  )
    return next()
  const allowedOrigin = new URL(config.clientUrl).origin
  let origin = request.get('Origin')
  if (!origin && request.get('Referer')) {
    try {
      origin = new URL(request.get('Referer')).origin
    } catch {
      origin = 'invalid'
    }
  }
  if (request.get('X-Requested-With') !== 'XMLHttpRequest' || (origin && origin !== allowedOrigin)) {
    return response
      .status(403)
      .json(failure('CSRF_REJECTED', 'Pyyntö ei ole sallittu. Päivitä sivu ja yritä uudelleen.'))
  }
  return next()
}
