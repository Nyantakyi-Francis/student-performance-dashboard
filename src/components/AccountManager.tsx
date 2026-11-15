import { useEffect, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { accountsSchema, errorMessage, readData, writeData } from '../api/workflow'

type AccountData = z.infer<typeof accountsSchema>
export default function AccountManager() {
  const [data, setData] = useState<AccountData | null>(null)
  const [revision, setRevision] = useState(0)
  const [form, setForm] = useState({ email: '', displayName: '', role: 'teacher', studentIds: [] as number[] })
  const [password, setPassword] = useState('')
  const [link, setLink] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    readData('/api/v1/admin/accounts', accountsSchema, controller.signal).then((value) => { if (!controller.signal.aborted) setData(value) }).catch((e) => { if (!controller.signal.aborted) setError(errorMessage(e)) })
    return () => controller.abort()
  }, [revision])
  async function action(path: string, body: unknown) {
    setBusy(true); setError(''); setLink('')
    try {
      const result = await writeData(path, body)
      if (result.data.token) setLink(`${window.location.origin}/#account-token=${result.data.token}`)
      setMessage(result.data.message ?? 'Account deactivated. This person can no longer access the school workspace.')
      setPassword(''); setRevision((v) => v + 1)
      return true
    } catch (e) { setError(errorMessage(e)); return false } finally { setBusy(false) }
  }
  async function invite(event: FormEvent) {
    event.preventDefault()
    if (await action('/api/v1/admin/invitations', { ...form, password })) setForm({ email: '', displayName: '', role: 'teacher', studentIds: [] })
  }
  return <section className="card workflow-section" aria-label="Account management">
    <h2>Accounts and recovery</h2>
    <p>Invitations expire after 24 hours; recovery links after 30 minutes. Verify the recipient before sharing a link. Links are shown once and no messages are sent automatically.</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {link && <div className="account-link"><label>Single-use account link<input readOnly value={link} onFocus={(e) => e.target.select()} /></label><button className="action-button secondary" onClick={() => setLink('')}>Hide account link</button></div>}
    <label>Your current password (for invitations and recovery)<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={128} /></label>
    <details><summary>Invite an account</summary><form className="workflow-form" onSubmit={invite}>
      <label>Invitee email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Invitee name<input required maxLength={100} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>
      <label>Invitee role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, studentIds: [] })}>{['teacher', 'administrator', 'student', 'guardian'].map((role) => <option key={role}>{role}</option>)}</select></label>
      {['student', 'guardian'].includes(form.role) && <label>Linked students (select one for student accounts)<select multiple value={form.studentIds.map(String)} onChange={(e) => setForm({ ...form, studentIds: Array.from(e.target.selectedOptions, (o) => Number(o.value)) })}>{data?.students.map((s) => <option key={s.id} value={s.id}>{s.studentNumber}: {s.firstName} {s.lastName}</option>)}</select></label>}
      <button className="action-button" disabled={busy || !password}>Create invitation link</button>
    </form></details>
    {data ? <>
      <div className="workflow-table" tabIndex={0} role="region" aria-label="School account table"><table><caption>School accounts</caption><thead><tr><th scope="col">Account</th><th scope="col">Role</th><th scope="col">State</th><th scope="col">Actions</th></tr></thead><tbody>{data.accounts.map((a) => <tr key={a.id}>
        <th scope="row">{a.displayName} ({a.email}){data.requests.some((r) => r.membershipId === a.id) && <p>Recovery requested</p>}</th><td>{a.role}</td><td>{a.status}</td><td className="workflow-actions">
          <button className="action-button secondary" disabled={busy || !password || a.status !== 'active'} onClick={() => action(`/api/v1/admin/accounts/${a.id}/recovery`, { password })}>Issue recovery for {a.displayName}</button>
          <button className="action-button secondary" disabled={busy || a.status !== 'active'} onClick={() => { if (window.confirm(`Deactivate ${a.displayName}'s school access and revoke its sessions?`)) void action(`/api/v1/admin/accounts/${a.id}/deactivate`, {}) }}>Deactivate {a.displayName}</button>
        </td>
      </tr>)}</tbody></table></div>
      <details><summary>Recent audit history</summary><ul>{data.events.map((e) => <li key={e.id}>{new Date(e.createdAt).toLocaleString()}: {e.action} (record {e.targetId ?? '—'})</li>)}</ul></details>
    </> : <button className="action-button secondary" onClick={() => setRevision((v) => v + 1)}>Load accounts</button>}
  </section>
}
