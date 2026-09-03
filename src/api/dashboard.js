const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001'
const DEFAULT_SCHOOL_SLUG = 'accra-demo-jhs'

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || DEFAULT_API_BASE_URL

const schoolSlug = import.meta.env.VITE_DEMO_SCHOOL_SLUG || DEFAULT_SCHOOL_SLUG

export async function fetchDashboardData() {
  const response = await fetch(
    `${apiBaseUrl}/api/v1/dashboard-data?schoolSlug=${schoolSlug}`
  )

  if (!response.ok) {
    throw new Error('Dashboard data could not be loaded.')
  }

  return response.json()
}
