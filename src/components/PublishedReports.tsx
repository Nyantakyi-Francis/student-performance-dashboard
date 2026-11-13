import { useEffect, useState } from 'react'
import { errorMessage, readData, reportsSchema, type Report } from '../api/workflow'

export default function PublishedReports({ revision = 0 }: { revision?: number }) {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    readData('/api/v1/reports', reportsSchema, controller.signal).then((data) => { if (!controller.signal.aborted) { setReports(data); setError('') } }).catch((e) => { if (!controller.signal.aborted) setError(errorMessage(e)) })
    return () => controller.abort()
  }, [revision, reload])
  return <section className="card workflow-section" aria-label="Published reports">
    <h2>Published reports</h2>
    <p>Only published snapshots appear here. Each total uses recorded assessments with positive weights under the same policy version. Missing, excused and incomplete work do not count as zero.</p>
    {error && <p role="alert">{error} <button onClick={() => setReload((v) => v + 1)}>Retry reports</button></p>}
    {!reports && !error && <p role="status">Loading published reports…</p>}
    {reports && !reports.some((r) => r.items.length) && <p>No published results are available for your permitted students.</p>}
    {reports?.filter((r) => r.items.length).map((report) => <article className="published-report" key={report.studentId}>
      <h3>{report.name} ({report.studentNumber})</h3>
      <div className="workflow-table" tabIndex={0} role="region" aria-label={`Published assessment table for ${report.name}`}><table><caption>Published assessments for {report.name}</caption><thead><tr><th scope="col">Term / subject</th><th scope="col">Assessment</th><th scope="col">Score</th><th scope="col">State</th><th scope="col">Policy / source version</th><th scope="col">Feedback</th></tr></thead><tbody>
        {report.items.map((item, i) => <tr key={i}><td>{item.term} / {item.subject}</td><th scope="row">{item.title}</th><td>{item.points === null ? '—' : `${item.points} / ${item.maximumScore}`}</td><td>{item.status}</td><td>{item.policy.version} / {item.assessmentVersion}</td><td>{item.feedback || '—'}</td></tr>)}
      </tbody></table></div>
      <ul>{report.totals.map((total, i) => <li key={i}>{total.term}, {total.subject}: {total.average === null ? 'Insufficient evidence' : `${total.average.toFixed(1)}% (${total.passed ? 'Pass' : 'Below pass mark'})`}. {total.risk}. {total.recordedCount} recorded of {total.assessmentCount}; weight denominator {total.weightDenominator}; policy {total.policyVersion}. Risk labels require staff review.</li>)}</ul>
    </article>)}
    <button className="action-button secondary print-button" onClick={() => window.print()}>Print published reports</button>
  </section>
}
