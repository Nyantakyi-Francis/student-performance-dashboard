import { ApiError, createApiClient, validateDashboardResponse } from './client.js'

export const hasConfiguredApiBaseUrl = Boolean(import.meta.env.VITE_API_BASE_URL) || import.meta.env.DEV
const client = createApiClient(import.meta.env.VITE_API_BASE_URL || '')
export function apiRequest(path, options) {
  if (!hasConfiguredApiBaseUrl) throw new ApiError('Database access is not configured. Set VITE_API_BASE_URL and rebuild the frontend.', 'NOT_CONFIGURED')
  return client(path, options)
}
export async function fetchDashboardData(options) {
  return validateDashboardResponse(await apiRequest('/api/v1/dashboard-data', options))
}
