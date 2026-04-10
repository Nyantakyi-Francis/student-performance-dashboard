import { formatSubjectLabel } from '../data/config'
import {
  getImprovementLeaders,
  getStudentAverage,
  getSubjectAverages,
  getRiskLevel,
  getUniqueStudentCount,
} from '../utils/analytics'

function InsightsPanel({ students, subjects, terms }) {
  if (!students.length || !subjects.length) {
    return (
      <section className="insights-panel">
        <div className="section-heading">
          <h2>Insights Panel</h2>
          <p>No data available for insights yet.</p>
        </div>
      </section>
    )
  }

  const subjectAverages = getSubjectAverages(students, subjects)

  const bestSubject = subjectAverages.reduce((best, current) =>
    current.average > best.average ? current : best
  )

  const weakestSubject = subjectAverages.reduce((weakest, current) =>
    current.average < weakest.average ? current : weakest
  )

  const atRiskStudents = students.filter((student) => {
    const average = getStudentAverage(student, subjects)
    return getRiskLevel(average) === 'At Risk'
  })
  const atRiskCount = getUniqueStudentCount(atRiskStudents)

  const excellentStudents = students.filter((student) => {
    const average = getStudentAverage(student, subjects)
    return getRiskLevel(average) === 'Excellent'
  })
  const excellentCount = getUniqueStudentCount(excellentStudents)

  const gradePerformanceMap = {}

  students.forEach((student) => {
    const average = getStudentAverage(student, subjects)

    if (!gradePerformanceMap[student.grade]) {
      gradePerformanceMap[student.grade] = {
        total: 0,
        count: 0,
      }
    }

    gradePerformanceMap[student.grade].total += average
    gradePerformanceMap[student.grade].count += 1
  })

  const gradePerformance = Object.entries(gradePerformanceMap).map(
    ([grade, data]) => ({
      grade,
      average: data.total / data.count,
    })
  )

  const bestGrade = gradePerformance.reduce((best, current) =>
    current.average > best.average ? current : best
  )

  const weakestGrade = gradePerformance.reduce((weakest, current) =>
    current.average < weakest.average ? current : weakest
  )

  const { largestDrop, mostImproved } = getImprovementLeaders(
    students,
    subjects,
    terms
  )

  return (
    <section className="insights-panel">
      <div className="section-heading">
        <h2>Insights Panel</h2>
        <p>Automatic observations based on the currently filtered student data.</p>
      </div>

      <div className="insights-grid">
        <article className="insight-card">
          <h3>Best Subject</h3>
          <p>
            {formatSubjectLabel(bestSubject.subject)} has the highest average score at{' '}
            <strong>{bestSubject.average.toFixed(1)}%</strong>.
          </p>
        </article>

        <article className="insight-card">
          <h3>Weakest Subject</h3>
          <p>
            {formatSubjectLabel(weakestSubject.subject)} has the lowest average score at{' '}
            <strong>{weakestSubject.average.toFixed(1)}%</strong>.
          </p>
        </article>

        <article className="insight-card">
          <h3>At-Risk Students</h3>
          <p>
            There {atRiskCount === 1 ? 'is' : 'are'} <strong>{atRiskCount}</strong>{' '}
            student{atRiskCount === 1 ? '' : 's'} currently flagged as at risk in
            the selected data.
          </p>
        </article>

        <article className="insight-card">
          <h3>Excellent Students</h3>
          <p>
            <strong>{excellentCount}</strong> student
            {excellentCount === 1 ? '' : 's'} are currently performing at an
            excellent level.
          </p>
        </article>

        <article className="insight-card">
          <h3>Best Performing Grade</h3>
          <p>
            {bestGrade.grade} is performing best with an average of{' '}
            <strong>{bestGrade.average.toFixed(1)}%</strong>.
          </p>
        </article>

        <article className="insight-card">
          <h3>Weakest Performing Grade</h3>
          <p>
            {weakestGrade.grade} currently has the lowest average at{' '}
            <strong>{weakestGrade.average.toFixed(1)}%</strong>.
          </p>
        </article>

        <article className="insight-card">
          <h3>Most Improved Student</h3>
          <p>
            {mostImproved ? (
              <>
                <strong>{mostImproved.name}</strong> improved by{' '}
                <strong>{mostImproved.change.toFixed(1)}</strong> points from{' '}
                {mostImproved.startTerm} to {mostImproved.endTerm}.
              </>
            ) : (
              'Add multiple terms for the same student to unlock progress tracking.'
            )}
          </p>
        </article>

        <article className="insight-card">
          <h3>Largest Drop</h3>
          <p>
            {largestDrop && largestDrop.change < 0 ? (
              <>
                <strong>{largestDrop.name}</strong> dropped by{' '}
                <strong>{Math.abs(largestDrop.change).toFixed(1)}</strong> points
                between {largestDrop.startTerm} and {largestDrop.endTerm}.
              </>
            ) : (
              'No negative trend was detected in the current comparison set.'
            )}
          </p>
        </article>
      </div>
    </section>
  )
}

export default InsightsPanel
