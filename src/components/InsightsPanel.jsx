import { formatSubjectLabel } from '../data/config'
import {
  getImprovementLeaders,
  getStudentAverage,
  getSubjectAverages,
  getRiskLevel,
  getUniqueStudentCount,
} from '../utils/analytics'
import { useMemo } from 'react'

function InsightsPanel({ students, subjects, terms }) {
  const insights = useMemo(() => {
    if (!students.length || !subjects.length) return null

    const subjectAverages = getSubjectAverages(students, subjects)

    const bestSubject = subjectAverages.reduce((best, current) =>
      current.average > best.average ? current : best
    )

    const weakestSubject = subjectAverages.reduce((weakest, current) =>
      current.average < weakest.average ? current : weakest
    )

    const averageByStudent = students.map((student) => ({
      student,
      average: getStudentAverage(student, subjects),
    }))

    const atRiskStudents = averageByStudent
      .filter(({ average }) => getRiskLevel(average) === 'At Risk')
      .map(({ student }) => student)
    const atRiskCount = getUniqueStudentCount(atRiskStudents)

    const excellentStudents = averageByStudent
      .filter(({ average }) => getRiskLevel(average) === 'Excellent')
      .map(({ student }) => student)
    const excellentCount = getUniqueStudentCount(excellentStudents)

    const gradePerformanceMap = {}

    averageByStudent.forEach(({ student, average }) => {
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

    const { largestDrop, mostImproved } = getImprovementLeaders(students, subjects, terms)

    return {
      atRiskCount,
      bestGrade,
      bestSubject,
      excellentCount,
      largestDrop,
      mostImproved,
      weakestGrade,
      weakestSubject,
    }
  }, [students, subjects, terms])

  if (!insights) {
    return (
      <section className="insights-panel">
        <div className="section-heading">
          <h2>Insights Panel</h2>
          <p>No data available for insights yet.</p>
        </div>
      </section>
    )
  }

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
            {formatSubjectLabel(insights.bestSubject.subject)} has the highest average score at{' '}
            <strong>{insights.bestSubject.average.toFixed(1)}%</strong>.
          </p>
        </article>

        <article className="insight-card">
          <h3>Weakest Subject</h3>
          <p>
            {formatSubjectLabel(insights.weakestSubject.subject)} has the lowest average score at{' '}
            <strong>{insights.weakestSubject.average.toFixed(1)}%</strong>.
          </p>
        </article>

        <article className="insight-card">
          <h3>At-Risk Students</h3>
          <p>
            There {insights.atRiskCount === 1 ? 'is' : 'are'}{' '}
            <strong>{insights.atRiskCount}</strong>{' '}
            student{insights.atRiskCount === 1 ? '' : 's'} currently flagged as at risk in
            the selected data.
          </p>
        </article>

        <article className="insight-card">
          <h3>Excellent Students</h3>
          <p>
            <strong>{insights.excellentCount}</strong> student
            {insights.excellentCount === 1 ? '' : 's'} are currently performing at an
            excellent level.
          </p>
        </article>

        <article className="insight-card">
          <h3>Best Performing Grade</h3>
          <p>
            {insights.bestGrade.grade} is performing best with an average of{' '}
            <strong>{insights.bestGrade.average.toFixed(1)}%</strong>.
          </p>
        </article>

        <article className="insight-card">
          <h3>Weakest Performing Grade</h3>
          <p>
            {insights.weakestGrade.grade} currently has the lowest average at{' '}
            <strong>{insights.weakestGrade.average.toFixed(1)}%</strong>.
          </p>
        </article>

        <article className="insight-card">
          <h3>Most Improved Student</h3>
          <p>
            {insights.mostImproved ? (
              <>
                <strong>{insights.mostImproved.name}</strong> improved by{' '}
                <strong>{insights.mostImproved.change.toFixed(1)}</strong> points from{' '}
                {insights.mostImproved.startTerm} to {insights.mostImproved.endTerm}.
              </>
            ) : (
              'Add multiple terms for the same student to unlock progress tracking.'
            )}
          </p>
        </article>

        <article className="insight-card">
          <h3>Largest Drop</h3>
          <p>
            {insights.largestDrop && insights.largestDrop.change < 0 ? (
              <>
                <strong>{insights.largestDrop.name}</strong> dropped by{' '}
                <strong>{Math.abs(insights.largestDrop.change).toFixed(1)}</strong> points
                between {insights.largestDrop.startTerm} and {insights.largestDrop.endTerm}.
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
