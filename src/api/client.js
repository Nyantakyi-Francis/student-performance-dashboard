export class ApiError extends Error {
  constructor(message, code = 'REQUEST_FAILED') {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const unavailableMessage = 'School records are temporarily unavailable. Please try again shortly.'

export function validateDashboardResponse(response) {
  const data = response?.data
  const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string')
  if (!data || !strings(data.grades) || !strings(data.subjects) || !strings(data.terms) || !Array.isArray(data.students)) throw new ApiError(unavailableMessage, 'INVALID_RESPONSE')
  const ids = new Set()
  for (const student of data.students) {
    if (!student || typeof student.id !== 'string' || ids.has(student.id) || !Number.isSafeInteger(student.studentId) || student.studentId <= 0 || typeof student.name !== 'string' || typeof student.grade !== 'string' || typeof student.term !== 'string' || (student.gender !== null && typeof student.gender !== 'string') || !student.scores || typeof student.scores !== 'object' || Array.isArray(student.scores) || !Object.values(student.scores).every((score) => score === null || (typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100))) throw new ApiError(unavailableMessage, 'INVALID_RESPONSE')
    ids.add(student.id)
  }
  return data
}

export function validateSessionResponse(response) {
  const data = response?.data
  if (!data || !['administrator', 'teacher', 'student', 'guardian'].includes(data.role) || !Number.isSafeInteger(data.membershipId) || !Number.isSafeInteger(data.schoolId) || !Number.isSafeInteger(data.userId) || !['displayName', 'schoolName', 'schoolSlug'].every((key) => typeof data[key] === 'string')) throw new ApiError('Please sign in again to continue.', 'INVALID_RESPONSE')
  return data
}

export function validateAccessResponse(response) {
  const data = response?.data
  const validItems = (items, label) => Array.isArray(items) && items.every((item) => Number.isSafeInteger(item.id) && item.id > 0 && typeof item[label] === 'string')
  if (!data || !validItems(data.teachers, 'displayName') || !validItems(data.classes, 'name') || !validItems(data.subjects, 'name') || !Array.isArray(data.assignments) || !data.assignments.every((item) => ['id', 'membershipId', 'classGroupId', 'subjectId'].every((key) => Number.isSafeInteger(item[key]) && item[key] > 0))) throw new ApiError('Teacher assignments could not be loaded. Please try again.', 'INVALID_RESPONSE')
  return data
}

export function createApiClient(baseUrl, fetcher = globalThis.fetch) {
  return async function request(path, { method = 'GET', body, signal } = {}) {
    const timeout = AbortSignal.timeout(15000)
    let response
    try {
      response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method, credentials: 'include', cache: 'no-store',
        headers: method === 'GET' ? {} : {
          'x-dashboard-request': '1',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      if (error.name === 'TimeoutError') throw new ApiError('This is taking longer than expected. Please try again.', 'TIMEOUT')
      throw new ApiError('Could not connect. Check your internet connection and try again.', 'NETWORK_ERROR')
    }
    let payload
    try { payload = await response.json() } catch { throw new ApiError(unavailableMessage, 'INVALID_RESPONSE') }
    if (response.status >= 500) throw new ApiError(unavailableMessage, payload?.error?.code || 'SERVICE_UNAVAILABLE')
    if (!response.ok) throw new ApiError(payload?.error?.message || 'The request could not be completed.', payload?.error?.code)
    return payload
  }
}
