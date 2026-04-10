import { formatSubjectLabel } from '../data/config'
import {
  getClassAverage,
  getSubjectAverages,
  getUniqueStudentCount,
} from '../utils/analytics'

function DashboardCards({ students, subjects }) {
  if (students.length === 0 || subjects.length === 0) {
    return (
      <section className="cards-grid">
        <div className="dashboard-card">
          <h3>Unique Students</h3>
          <p>0</p>
        </div>
        <div className="dashboard-card">
          <h3>Class Average</h3>
          <p>0.0%</p>
        </div>
        <div className="dashboard-card">
          <h3>Best Subject</h3>
          <p>N/A</p>
        </div>
        <div className="dashboard-card">
          <h3>Weakest Subject</h3>
          <p>N/A</p>
        </div>
      </section>
    )
  }

  const uniqueStudents = getUniqueStudentCount(students)
  const classAverage = getClassAverage(students, subjects)
  const subjectAverages = getSubjectAverages(students, subjects)
  const bestSubject = [...subjectAverages].sort((a, b) => b.average - a.average)[0]
  const weakestSubject = [...subjectAverages].sort((a, b) => a.average - b.average)[0]

  const cards = [
    { title: 'Unique Students', value: uniqueStudents },
    { title: 'Class Average', value: `${classAverage.toFixed(1)}%` },
    { title: 'Best Subject', value: formatSubjectLabel(bestSubject.subject) },
    { title: 'Weakest Subject', value: formatSubjectLabel(weakestSubject.subject) },
  ]

  return (
    <section className="cards-grid">
      {cards.map((card) => (
        <div className="dashboard-card" key={card.title}>
          <h3>{card.title}</h3>
          <p>{card.value}</p>
        </div>
      ))}
    </section>
  )
}

export default DashboardCards
