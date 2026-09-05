'use strict'

// In-memory, per-IP sliding-window limiter - no external dependency needed
// for capping abuse of a single endpoint.
function rateLimiter({ windowMs, max }) {
  const hits = new Map()

  const sweep = setInterval(() => {
    const cutoff = Date.now() - windowMs
    for (const [key, entry] of hits) {
      if (entry.windowStart < cutoff) hits.delete(key)
    }
  }, windowMs)
  sweep.unref()

  return function (request, response, next) {
    const key = request.ip
    const now = Date.now()
    const entry = hits.get(key)

    if (!entry || now - entry.windowStart > windowMs) {
      hits.set(key, { windowStart: now, count: 1 })
      return next()
    }

    entry.count += 1
    if (entry.count > max) {
      return response.status(429).json({ success: false, message: 'Liikaa pyyntöjä. Yritä myöhemmin uudelleen.' })
    }
    return next()
  }
}

export default rateLimiter
