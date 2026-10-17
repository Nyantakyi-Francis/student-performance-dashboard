import { useEffect, useState } from 'react'
import { validateAccessResponse } from '../api/client'
import { apiRequest } from '../api/dashboard'

export default function AccessManager({ onUnauthorized }) {
  const [data, setData] = useState(null)
  const [selection, setSelection] = useState({ membershipId: '', classGroupId: '', subjectId: '' })
  const [message, setMessage] = useState('Loading teaching assignments...')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    apiRequest('/api/v1/admin/access', { signal: controller.signal }).then((response) => {
      if (!controller.signal.aborted) { setData(validateAccessResponse(response)); setMessage('') }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setData(null)
        setMessage(error.message)
        if (['UNAUTHENTICATED', 'FORBIDDEN'].includes(error.code)) onUnauthorized()
      }
    })
    return () => controller.abort()
  }, [reload, onUnauthorized])
  const mutate = async (path, options) => {
    setBusy(true)
    try {
      await apiRequest(path, options)
      setMessage('Assignment saved. Teachers see the change on their next reload.')
      setReload((value) => value + 1)
    } catch (error) {
      setMessage(error.message)
      if (error.code === 'UNAUTHENTICATED') onUnauthorized()
    } finally { setBusy(false) }
  }
  const add = (event) => {
    event.preventDefault()
    mutate('/api/v1/admin/teaching-assignments', { method: 'POST', body: Object.fromEntries(Object.entries(selection).map(([key, value]) => [key, Number(value)])) })
  }
  const name = (items, id) => items.find((item) => item.id === id)?.name ?? items.find((item) => item.id === id)?.displayName ?? String(id)
  return (
    <section className="card access-manager" aria-label="Teacher access management">
      <h2>Teacher assignments</h2>
      <p>Grant access to a class and subject in your school. Removing an assignment takes effect on the teacher's next request.</p>
      {message && <p role="status">{message}</p>}
      {data ? <>
        <form className="assignment-form" onSubmit={add}>
          {[
            ['membershipId', 'Teacher', data.teachers], ['classGroupId', 'Class', data.classes], ['subjectId', 'Subject', data.subjects],
          ].map(([key, label, items]) => <label key={key}>{label}<select value={selection[key]} onChange={(event) => setSelection({ ...selection, [key]: event.target.value })} required><option value="">Choose {label.toLowerCase()}</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name ?? item.displayName}</option>)}</select></label>)}
          <button className="action-button" disabled={busy}>Assign teacher</button>
        </form>
        <ul>{data.assignments.map((assignment) => <li key={assignment.id}>
          {name(data.teachers, assignment.membershipId)}: {name(data.classes, assignment.classGroupId)}, {name(data.subjects, assignment.subjectId)}{' '}
          <button className="action-button secondary" disabled={busy} onClick={() => mutate(`/api/v1/admin/teaching-assignments/${assignment.id}`, { method: 'DELETE' })}>Remove assignment</button>
        </li>)}</ul>
        {!data.assignments.length && <p>No teaching assignments yet.</p>}
      </> : <button className="action-button secondary" onClick={() => setReload((value) => value + 1)}>Retry assignments</button>}
    </section>
  )
}
