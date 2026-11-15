import { useEffect, useState, type FormEvent } from 'react'
import Papa from 'papaparse'
import { z } from 'zod'
import { detailSchema, errorMessage, readData, workspaceSchema, writeData, type Detail, type ScoreRow, type WorkspaceData } from '../api/workflow'

type Props = { role: string; onChanged: () => void }
const initialForm = { title: '', classGroupId: '', subjectId: '', termId: '', assessedOn: '', maximumScore: '100', weight: '1' }
export default function AssessmentWorkspace({ role, onChanged }: Props) {
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [form, setForm] = useState(initialForm)
  const [selected, setSelected] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [reason, setReason] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [preview, setPreview] = useState<{ previewId: number | null; errors: { row: number; message: string }[]; count: number } | null>(null)
  const [csv, setCsv] = useState<Papa.ParseResult<Record<string, string>> | null>(null)
  const [mapping, setMapping] = useState({ studentNumber: 'studentNumber', status: 'status', points: 'points', feedback: 'feedback' })
  const [policyForm, setPolicyForm] = useState({ passMark: '50', goodMark: '60', excellentMark: '80', minimumScores: '1' })

  useEffect(() => {
    const controller = new AbortController()
    readData('/api/v1/workspace', workspaceSchema, controller.signal).then((value) => {
      if (controller.signal.aborted) return
      setData(value)
      setPolicyForm({ passMark: String(value.policy.passMark), goodMark: String(value.policy.goodMark), excellentMark: String(value.policy.excellentMark), minimumScores: String(value.policy.minimumScores) })
    }).catch((e) => { if (!controller.signal.aborted) setError(errorMessage(e)) })
    return () => controller.abort()
  }, [revision])
  useEffect(() => {
    if (!selected) return
    const controller = new AbortController()
    readData(`/api/v1/assessments/${selected}`, detailSchema, controller.signal).then((value) => {
      if (controller.signal.aborted) return
      setDetail(value); setRows(value.rows); setDirty(false); setPreview(null); setCsv(null); setReason('')
    }).catch((e) => { if (!controller.signal.aborted) { setDetail(null); setError(errorMessage(e)) } })
    return () => controller.abort()
  }, [selected, revision])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const navigate = (event: Event) => { if (!window.confirm('Discard unsaved assessment scores?')) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    window.addEventListener('before-school-navigation', navigate)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('before-school-navigation', navigate) }
  }, [dirty])
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('')
    try { await work() } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  function refresh(message: string) { setMessage(message); setDirty(false); setPreview(null); setRevision((v) => v + 1); onChanged() }
  async function create(event: FormEvent) {
    event.preventDefault()
    if (dirty && !window.confirm('Discard unsaved scores before creating another assessment?')) return
    await act(async () => {
      const response = await writeData('/api/v1/assessments', { ...form, classGroupId: Number(form.classGroupId), subjectId: Number(form.subjectId), termId: Number(form.termId), maximumScore: Number(form.maximumScore), weight: Number(form.weight) })
      setSelected(String(response.data.id)); setForm(initialForm); refresh('Assessment created. Enter draft scores below.')
    })
  }
  function editRow(index: number, updates: Partial<ScoreRow>) {
    setRows((previous) => previous.map((row, i) => i === index ? { ...row, ...updates } : row)); setDirty(true); setPreview(null)
  }
  const payload = () => ({ version: detail!.assessment.version, reason, rows: rows.map(({ enrollmentId, status, points, feedback }) => ({ enrollmentId, status, points, feedback })) })
  async function readFile(file?: File) {
    setPreview(null); setCsv(null)
    if (!file) return
    if (file.size > 256 * 1024) { setError('Choose a CSV file no larger than 256 KB.'); return }
    const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim() })
    if (parsed.errors.length || parsed.data.length > 500 || !parsed.meta.fields?.length) { setError('CSV needs unique headers and at most 500 well-formed data rows.'); return }
    setError(''); setCsv(parsed)
  }
  async function validateCsv() {
    if (!csv || !detail) return
    await act(async () => {
      if (!mapping.studentNumber || !mapping.points) throw new Error('Map the student number and points columns.')
      const errors: string[] = []
      const importRows = csv.data.map((row, i) => {
        const person = detail.rows.find((r) => r.studentNumber === row[mapping.studentNumber]?.trim())
        const raw = row[mapping.points]?.trim() ?? ''
        const status = row[mapping.status]?.trim().toLowerCase() || (raw === '' ? 'missing' : 'scored')
        const points = raw === '' ? null : Number(raw)
        if (!person) errors.push(`Row ${i + 2}: unknown student number.`)
        if (!['scored', 'missing', 'excused', 'incomplete'].includes(status)) errors.push(`Row ${i + 2}: invalid score state.`)
        if (points !== null && !Number.isFinite(points)) errors.push(`Row ${i + 2}: points must be numeric.`)
        return { enrollmentId: person?.enrollmentId ?? 0, status, points, feedback: row[mapping.feedback] ?? '' }
      })
      if (errors.length) throw new Error(errors.join(' '))
      const response = await writeData(`/api/v1/assessments/${selected}/import-preview`, { version: detail.assessment.version, reason, rows: importRows })
      setPreview(z.object({ previewId: z.number().nullable(), errors: z.array(z.object({ row: z.number(), message: z.string() })), count: z.number() }).parse(response.data))
    })
  }
  return <section className="card workflow-section" aria-label="Assessment workspace">
    <h2>Assessment workspace</h2>
    <p>Create assessments, enter scores, and publish results when they are ready to share.</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!data ? <button className="action-button secondary" onClick={() => setRevision((v) => v + 1)}>Load assessment workspace</button> : <>
      <details><summary>Create an assessment</summary>
        <form className="workflow-form" onSubmit={create}>
          <label>Assessment title<input value={form.title} maxLength={120} required onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>Assessment class<select required value={form.classGroupId} onChange={(e) => setForm({ ...form, classGroupId: e.target.value, termId: '' })}><option value="">Choose class</option>{data.classes.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
          <label>Assessment subject<select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}><option value="">Choose subject</option>{data.subjects.filter((s) => role === 'administrator' || data.assignments.some((a) => a.subjectId === s.id && a.classGroupId === Number(form.classGroupId))).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
          <label>Assessment term<select required value={form.termId} onChange={(e) => { const term = data.terms.find((t) => t.id === Number(e.target.value)); setForm({ ...form, termId: e.target.value, assessedOn: term?.startsOn ?? '' }) }}><option value="">Choose term</option>{data.terms.filter((t) => t.academicYearId === data.classes.find((c) => c.id === Number(form.classGroupId))?.academicYearId && !['locked', 'archived'].includes(t.status)).map((v) => <option key={v.id} value={v.id}>{v.name} ({v.startsOn} – {v.endsOn})</option>)}</select></label>
          <label>Assessment date<input type="date" required value={form.assessedOn} onChange={(e) => setForm({ ...form, assessedOn: e.target.value })} /></label>
          <label>Maximum points<input type="number" min="0.01" max="99999.99" step="0.01" required value={form.maximumScore} onChange={(e) => setForm({ ...form, maximumScore: e.target.value })} /></label>
          <label>Assessment weight<input type="number" min="0" max="999.9999" step="0.0001" required value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></label>
          <button className="action-button" disabled={busy}>Create assessment</button>
        </form>
      </details>
      <label>Open assessment<select value={selected} disabled={busy} onChange={(e) => { if (dirty && !window.confirm('Discard unsaved scores?')) return; setSelected(e.target.value); setDetail(null); setError(''); setMessage('') }}><option value="">Choose assessment</option>{data.assessments.map((a) => <option key={a.id} value={a.id}>{a.title} — {data.classes.find((c) => c.id === a.classGroupId)?.name}, {data.subjects.find((s) => s.id === a.subjectId)?.name} ({a.status})</option>)}</select></label>
      {detail && <div className="score-editor">
        <h3>{detail.assessment.title}: draft score entry</h3>
        <p>Out of {detail.assessment.maximumScore} points. {dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
        <div className="workflow-table" tabIndex={0} role="region" aria-label="Score entry table"><table><caption>Scores for {detail.assessment.title}</caption><thead><tr><th scope="col">Student</th><th scope="col">State</th><th scope="col">Points</th><th scope="col">Feedback visible in reports</th></tr></thead><tbody>{rows.map((row, i) => <tr key={row.enrollmentId}>
          <th scope="row">{row.name} ({row.studentNumber})</th>
          <td><select aria-label={`State for ${row.studentNumber}`} value={row.status} disabled={busy} onChange={(e) => editRow(i, { status: e.target.value as ScoreRow['status'], points: e.target.value === 'scored' ? row.points : null })}>{['scored', 'missing', 'excused', 'incomplete'].map((s) => <option key={s}>{s}</option>)}</select></td>
          <td><input aria-label={`Points for ${row.studentNumber}`} type="number" min="0" max={detail.assessment.maximumScore} step="0.01" disabled={busy || row.status !== 'scored'} value={row.points ?? ''} onChange={(e) => editRow(i, { points: e.target.value === '' ? null : Number(e.target.value) })} /></td>
          <td><input aria-label={`Feedback for ${row.studentNumber}`} value={row.feedback} maxLength={2000} disabled={busy} onChange={(e) => editRow(i, { feedback: e.target.value })} /></td>
        </tr>)}</tbody></table></div>
        {!rows.length && <p>No active enrollments in this class.</p>}
        <label>Publication or amendment reason<input value={reason} maxLength={500} onChange={(e) => { setReason(e.target.value); setPreview(null) }} placeholder="Required for publication and amendments" /></label>
        <div className="workflow-actions">
          <button className="action-button" disabled={busy || !dirty || !rows.length} onClick={() => act(async () => { await writeData(`/api/v1/assessments/${selected}/scores`, payload()); refresh('Draft scores saved.') })}>Save draft scores</button>
          <button className="action-button secondary" disabled={busy || dirty || !reason.trim() || detail.assessment.status === 'published'} onClick={() => act(async () => { await writeData(`/api/v1/assessments/${selected}/publish`, { version: detail.assessment.version, policyVersion: data.policy.version, reason }); refresh('Results published. Students and guardians can now view them.') })}>Publish results</button>
          <button className="action-button secondary" disabled={busy} onClick={() => { if (!dirty || window.confirm('Discard unsaved scores and reload?')) setRevision((v) => v + 1) }}>Reload assessment</button>
        </div>
        <details><summary>Import scores from CSV</summary>
          <p>Use the student numbers shown above and match your file columns below. Review the preview before saving. Up to 500 rows, 256 KB.</p>
          <code>studentNumber,status,points,feedback</code>
          <label>Score CSV file<input type="file" accept=".csv,text/csv" disabled={busy || dirty} onChange={(e) => void readFile(e.target.files?.[0])} /></label>
          {csv && <><div className="workflow-form">{Object.entries(mapping).map(([key, value]) => <label key={key}>{({ studentNumber: 'Student number', status: 'Status', points: 'Points', feedback: 'Feedback' })[key]} column<select value={value} onChange={(e) => { setMapping({ ...mapping, [key]: e.target.value }); setPreview(null) }}><option value="">Not mapped</option>{csv.meta.fields?.map((field) => <option key={field}>{field}</option>)}</select></label>)}</div><button className="action-button secondary" disabled={busy || dirty} onClick={validateCsv}>Preview import</button></>}
          {preview && <div><p role="status">{preview.count} rows previewed; {preview.errors.length} errors. No scores have changed.</p><ul>{preview.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}</ul><div className="workflow-table" tabIndex={0} role="region" aria-label="Import preview table"><table><caption>Import preview (first 20 rows)</caption><thead><tr><th scope="col">Student number</th><th scope="col">State</th><th scope="col">Points</th><th scope="col">Feedback</th></tr></thead><tbody>{csv?.data.slice(0, 20).map((row, i) => <tr key={i}><th scope="row">{row[mapping.studentNumber]}</th><td>{row[mapping.status] || (row[mapping.points]?.trim() ? 'scored' : 'missing')}</td><td>{row[mapping.points] || '—'}</td><td>{row[mapping.feedback] || '—'}</td></tr>)}</tbody></table></div>{preview.previewId && <button className="action-button" disabled={busy || dirty} onClick={() => act(async () => { await writeData(`/api/v1/imports/${preview.previewId}/commit`); refresh('Imported scores saved.') })}>Save imported scores</button>}</div>}
        </details>
      </div>}
      <details><summary>Grading settings</summary>
        <p>Assessment weights determine how much each score counts toward the average. Work without a score is excluded. Changing these settings applies to future publications; previously released reports keep their original grading rules.</p>
        {role === 'administrator' ? <form className="workflow-form" onSubmit={(e) => { e.preventDefault(); void act(async () => { await writeData('/api/v1/grading-policies', Object.fromEntries(Object.entries(policyForm).map(([k, v]) => [k, Number(v)]))); setRevision((v) => v + 1); setMessage('Grading settings saved. Previously published reports keep their original grades.') }) }}>
          {Object.entries(policyForm).map(([key, value]) => <label key={key}>{({ passMark: 'Pass mark (%)', goodMark: 'Good threshold (%)', excellentMark: 'Excellent threshold (%)', minimumScores: 'Minimum recorded assessments' })[key]}<input type="number" min={key === 'minimumScores' ? 1 : 0} max={key === 'minimumScores' ? 500 : 100} step={key === 'minimumScores' ? 1 : 0.01} required value={value} onChange={(e) => setPolicyForm({ ...policyForm, [key]: e.target.value })} /></label>)}
          <button className="action-button" disabled={busy || dirty}>Save grading settings</button>
        </form> : <p>Pass: {data.policy.passMark}%; good: {data.policy.goodMark}%; excellent: {data.policy.excellentMark}%; minimum recorded: {data.policy.minimumScores}.</p>}
      </details>
    </>}
  </section>
}
