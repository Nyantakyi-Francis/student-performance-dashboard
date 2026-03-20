import { formatSubjectLabel } from '../data/config'

function DashboardCards({ students, subjects }) {
  if (students.length === 0) {
    return (
      <section className="cards-grid">
        <div className="dashboard-card">
          <h3>Total Students</h3>
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

  const totalStudents = students.length

  const subjectAverages = {}

  subjects.forEach((subject) => {
    const total = students.reduce(
      (sum, student) => sum + (student.scores[subject] ?? 0),
      0
    )
    subjectAverages[subject] = total / totalStudents
  })

  const classAverage =
    Object.values(subjectAverages).reduce((sum, value) => sum + value, 0) /
    subjects.length

  const bestSubject = Object.entries(subjectAverages).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0]

  const weakestSubject = Object.entries(subjectAverages).reduce((a, b) =>
    a[1] < b[1] ? a : b
  )[0]

  const cards = [
    { title: 'Total Students', value: totalStudents },
    { title: 'Class Average', value: `${classAverage.toFixed(1)}%` },
    { title: 'Best Subject', value: formatSubjectLabel(bestSubject) },
    { title: 'Weakest Subject', value: formatSubjectLabel(weakestSubject) },
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