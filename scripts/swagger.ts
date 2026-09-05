// swagger.ts
import swaggerAutogen from 'swagger-autogen'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const doc = {
  info: {
    title: 'Asteriski Register API',
    description: 'Auto-generated Swagger documentation for Asteriski register API',
  },
  host: 'localhost:3001',
  tags: [
    { name: 'Authentication', description: 'Registration, login, and password recovery' },
    { name: 'Administration', description: 'Administrative member management' },
    { name: 'Membership', description: 'Member details and membership status' },
    { name: 'Payments', description: 'Payment creation, status, and webhooks' },
  ],
}

const outputFile = resolve(process.cwd(), 'swagger.json')
const routes = ['./scripts/swagger-routes.ts']

await swaggerAutogen()(outputFile, routes, doc)

const tagByPathPrefix: Record<string, string> = {
  '/api/register': 'Authentication',
  '/api/login': 'Authentication',
  '/api/forgot': 'Authentication',
  '/api/reset': 'Authentication',
  '/api/admin': 'Administration',
  '/api/member': 'Membership',
  '/api/pay': 'Payments',
}

const swaggerDocument = JSON.parse(readFileSync(outputFile, 'utf8'))

for (const [path, operations] of Object.entries(swaggerDocument.paths)) {
  const tag = Object.entries(tagByPathPrefix).find(([prefix]) => path.startsWith(prefix))?.[1]

  if (!tag) continue

  for (const operation of Object.values(operations as Record<string, Record<string, unknown>>)) {
    if (typeof operation === 'object' && operation !== null) {
      operation.tags = [tag]
    }
  }
}

writeFileSync(outputFile, JSON.stringify(swaggerDocument, null, 2) + '\n')
