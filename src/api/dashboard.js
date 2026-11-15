import { ApiError, createApiClient, validateDashboardResponse } from './client.js'

export const hasConfiguredApiBaseUrl = Boolean(import.meta.env.VITE_API_BASE_URL) || import.meta.env.DEV
const client = createApiClient(import.meta.env.VITE_API_BASE_URL || '')
export function apiRequest(path, options) {
  if (!hasConfiguredApiBaseUrl) throw new ApiError('The school workspace is unavailable right now. Please try again later.', 'NOT_CONFIGURED')
  return client(path, options).catch((error) => {
    if (error.code === 'UNAUTHENTICATED') window.dispatchEvent(new Event('school-session-expired'))
    throw error
  })
}
export async function fetchDashboardData(options) {
  return validateDashboardResponse(await apiRequest('/api/v1/dashboard-data', options))
}
