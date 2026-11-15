// Vercel adds the matched wildcard to the query when rewriting /api/:path*.
// Remove only that exact routing value; preserve all application query filters.
export function normalizeVercelRequestUrl(requestUrl: string) {
  const url = new URL(requestUrl, 'http://internal')
  const wildcard = url.pathname.startsWith('/api/') ? url.pathname.slice(5) : null
  const values = url.searchParams.getAll('path')
  if (wildcard && values.length === 1 && values[0] === wildcard) url.searchParams.delete('path')
  if (url.pathname === '/api/health') url.pathname = '/health'
  return url.pathname + url.search
}
