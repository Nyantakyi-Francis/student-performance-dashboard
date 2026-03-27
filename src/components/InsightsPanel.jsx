import { formatSubjectLabel } from '../data/config'
import { getStudentAverage, getRiskLevel } from '../utils/analytics'

function InsightsPanel({ students, subjects }) {
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

  const subjectAverages = subjects.map((subject) => {
    const total = students.reduce((sum, student) => {
      return sum + (student.scores?.[subject] ?? 0)
    }, 0)

    return {
      subject,
      average: total / students.length,
    }
  })

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

  const excellentStudents = students.filter((student) => {
    const average = getStudentAverage(student, subjects)
    return getRiskLevel(average) === 'Excellent'
  })

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
            There {atRiskStudents.length === 1 ? 'is' : 'are'}{' '}
            <strong>{atRiskStudents.length}</strong>{' '}
            student{atRiskStudents.length === 1 ? '' : 's'} currently classified as at risk.
          </p>
        </article>

        <article className="insight-card">
          <h3>Excellent Students</h3>
          <p>
            <strong>{excellentStudents.length}</strong>{' '}
            student{excellentStudents.length === 1 ? '' : 's'} are currently performing at an excellent level.
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
      </div>
    </section>
  )
}

export default InsightsPanel