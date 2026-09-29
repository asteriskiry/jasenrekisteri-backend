// Import the legacy CSV through the same authenticated API as the admin UI.
import axios from 'axios'
import { parseStream } from 'fast-csv'
import fs from 'node:fs'
import prompt from 'prompt'

const filePath = process.argv[2]
if (!filePath || process.argv.length !== 3) throw new Error('Usage: npm run import -- <full-path-to-csv>')
fs.accessSync(filePath, fs.constants.R_OK)
const baseURL = process.env.IMPORT_API_URL || 'http://localhost:3001/api'
const url = new URL(baseURL)
if (
  url.protocol !== 'https:' &&
  !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
) {
  throw new Error('IMPORT_API_URL must use HTTPS or a local loopback address.')
}
const api = axios.create({ baseURL, headers: { 'X-Requested-With': 'XMLHttpRequest' } })
prompt.start()
const credentials = await prompt.get([
  { name: 'email', description: 'Admin email', required: true },
  { name: 'password', description: 'Password', required: true, hidden: true, replace: '*' },
])
let cookie
try {
  const login = await api.post('/login', credentials)
  credentials.password = ''
  const session = login.headers['set-cookie']?.find((value) => /^(?:__Host-)?jasenrekisteri-session=/.test(value))
  if (!session) throw new Error('Login did not issue a session.')
  cookie = session.split(';')[0]
  api.defaults.headers.common.Cookie = cookie
  if (login.data.data.role !== 'Admin') throw new Error('An administrator account is required.')
  let count = 0
  const rows = parseStream(fs.createReadStream(filePath), { headers: false, delimiter: ';' })
  for await (const data of rows) {
    const response = await api.post('/admin/new', {
      firstName: data[0],
      lastName: data[1],
      utuAccount: data[2].replace(/@.*$/, ''),
      email: data[2],
      hometown: data[5],
      tyyMember: data[6] === 'kyllä',
      tiviaMember: data[7] === 'kyllä',
      role: 'Member',
      accessRights: data[8] === 'kyllä',
      membershipStarts: new Date(data[3].replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1')),
      membershipEnds: new Date(data[4].replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1')),
      accepted: true,
    })
    if (!response.data.success) throw new Error('Import stopped: member could not be saved.')
    count += 1
  }
  console.log('Imported ' + count + ' members.')
} catch (error) {
  // Axios errors contain request headers and credentials; never print the object.
  console.error(
    axios.isAxiosError(error) ? 'Import failed: ' + (error.response?.status || 'network error') : error.message
  )
  process.exitCode = 1
} finally {
  credentials.password = ''
  if (cookie) {
    try {
      await api.post('/logout')
    } catch {
      console.error('Could not revoke the import session; it expires within eight hours.')
      process.exitCode = 1
    }
  }
}
