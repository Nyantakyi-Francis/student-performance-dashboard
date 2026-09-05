import { buildApp } from '../app.js'
import { parseConfig } from '../config.js'
import { createDatabase } from '../database/client.js'
import { schools } from '../database/schema.js'
import { eq } from 'drizzle-orm'

const config = parseConfig(process.env)
const database = createDatabase(config)
const app = await buildApp({ config, database: database.db })

async function assertOkJson(path: string) {
  const response = await app.inject({ method: 'GET', url: path })

  if (response.statusCode !== 200) {
    throw new Error(
      `${path} returned ${response.statusCode}: ${response.body.slice(0, 500)}`
    )
  }

  return response.json()
}

try {
  const health = await assertOkJson('/health')
  const [school] = await database.db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.slug, 'accra-demo-jhs'))
    .limit(1)

  if (!school) {
    throw new Error('Demo school accra-demo-jhs was not found.')
  }

  const students = await assertOkJson(`/api/v1/students?schoolId=${school.id}`)
  const dashboard = await assertOkJson(
    '/api/v1/dashboard-data?schoolSlug=accra-demo-jhs'
  )

  if (health.data?.status !== 'ok') {
    throw new Error('/health returned an unexpected payload.')
  }

  if (!Array.isArray(students.data) || students.data.length === 0) {
    throw new Error('/api/v1/students returned no seeded students.')
  }

  if (
    !Array.isArray(dashboard.data?.students) ||
    dashboard.data.students.length === 0
  ) {
    throw new Error('/api/v1/dashboard-data returned no dashboard records.')
  }

  console.log(
    [
      'Database-backed read path is working.',
      `Students endpoint returned ${students.data.length} students.`,
      `Dashboard endpoint returned ${dashboard.data.students.length} student-term records.`,
    ].join('\n')
  )
} finally {
  await app.close()
  await database.client.end()
}
