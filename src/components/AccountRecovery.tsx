import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage, writeData } from '../api/workflow'

function consumeToken() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const token = params.get('account-token') ?? ''
  if (token) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  return token
}
// Consume once outside React rendering; StrictMode must not discard the token.
let pendingToken = consumeToken()
export default function AccountRecovery() {
  const [token, setToken] = useState(pendingToken)
  const [openedWithToken] = useState(Boolean(pendingToken))
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [schoolSlug, setSchoolSlug] = useState('accra-demo-jhs')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { pendingToken = '' }, [])
  async function submit(event: FormEvent, redeem: boolean) {
    event.preventDefault(); setBusy(true)
    try {
      const result = await writeData(redeem ? '/api/v1/auth/redeem' : '/api/v1/auth/recovery-request', redeem ? { token, password } : { email, schoolSlug })
      setMessage(result.data.message)
      if (redeem) { setToken(''); setPassword('') }
    } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) }
  }
  return <section className="card workflow-section" aria-label="Account help">
    <h2>Account help</h2>
    <details open={openedWithToken}><summary>Accept an invitation or set a recovered password</summary>
      <form onSubmit={(event) => submit(event, true)} className="workflow-form">
        <label>Single-use account token<input type="password" value={token} onChange={(e) => setToken(e.target.value)} required autoComplete="off" /></label>
        <label>New password (12–128 characters)<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} maxLength={128} required autoComplete="new-password" /></label>
        <button className="action-button" disabled={busy}>Save account password</button>
      </form>
    </details>
    <details><summary>Request password recovery</summary><p>Your school administrator verifies your identity and provides a recovery link. No automated email is sent.</p><form className="workflow-form" onSubmit={(event) => submit(event, false)}>
      <label>Recovery school code<input value={schoolSlug} onChange={(e) => setSchoolSlug(e.target.value)} required /></label>
      <label>Recovery email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
      <button className="action-button" disabled={busy}>Request recovery</button>
    </form></details>
    {message && <p role="status">{message}</p>}
  </section>
}
