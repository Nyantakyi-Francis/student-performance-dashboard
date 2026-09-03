const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001'
const DEFAULT_SCHOOL_SLUG = 'accra-demo-jhs'

export const hasConfiguredApiBaseUrl = Boolean(import.meta.env.VITE_API_BASE_URL)

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? DEFAULT_API_BASE_URL : '')

const schoolSlug = import.meta.env.VITE_DEMO_SCHOOL_SLUG || DEFAULT_SCHOOL_SLUG

export async function fetchDashboardData() {
  if (!apiBaseUrl) {
    throw new Error('Dashboard API is not configured.')
  }

  const response = await fetch(
    `${apiBaseUrl}/api/v1/dashboard-data?schoolSlug=${schoolSlug}`
  )

  if (!response.ok) {
    throw new Error('Dashboard data could not be loaded.')
  }

  return response.json()
}
