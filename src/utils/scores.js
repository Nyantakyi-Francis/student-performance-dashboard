// A blank score is missing; invalid input remains distinguishable as NaN.
export function parseScore(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null
  if (typeof value !== 'number' && typeof value !== 'string') return NaN
  const score = Number(value)
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : NaN
}

export function isRecordedScore(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

export function formatAverage(value) {
  return value == null ? 'No scores' : `${value.toFixed(1)}%`
}
