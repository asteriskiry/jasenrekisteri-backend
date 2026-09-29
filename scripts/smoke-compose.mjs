import assert from 'node:assert/strict'

const base = 'http://localhost:8080'
assert.equal((await fetch('http://localhost:3001/health')).status, 200)
for (const route of ['/', '/join', '/member/pay/return?canceled=true']) {
  const response = await fetch(base + route)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/)
  const html = await response.text()
  const asset = html.match(/src="([^"]+\.js)"/)[1]
  assert.equal((await fetch(base + asset)).status, 200)
}
const login = await fetch(base + '/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@example.com', password: 'password' }),
})
assert.equal(login.status, 200)
const {
  data: { token },
} = await login.json()
const member = await fetch(base + '/api/member/details', { headers: { Authorization: token } })
assert.equal(member.status, 200)
assert.equal((await member.json()).email, 'admin@example.com')
assert.equal((await fetch(base + '/api/member/details')).status, 401)
assert.equal((await fetch(base + '/api/admin/list', { headers: { Authorization: token } })).status, 200)
const before = await (await fetch('http://localhost:8025/api/v1/messages')).json()
const forgot = await fetch(base + '/api/forgot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@example.com' }),
})
assert.equal(forgot.status, 200)
assert.equal((await forgot.json()).success, true)
const after = await (await fetch('http://localhost:8025/api/v1/messages')).json()
assert.equal(after.total, before.total + 1)
console.log(
  'Compose smoke test passed: readiness, SPA routes/assets, security headers, login, protected APIs and local email.'
)
