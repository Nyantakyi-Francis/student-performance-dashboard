import { formatSubjectLabel } from '../data/config'
import {
  getClassAverage,
  getSubjectAverages,
  getUniqueStudentCount,
} from '../utils/analytics'
import { useMemo } from 'react'

function DashboardCards({ students, subjects }) {
  const cards = useMemo(() => {
    if (students.length === 0 || subjects.length === 0) {
      return [
        { title: 'Unique Students', value: 0 },
        { title: 'Class Average', value: '0.0%' },
        { title: 'Best Subject', value: 'N/A' },
        { title: 'Weakest Subject', value: 'N/A' },
      ]
    }

    const uniqueStudents = getUniqueStudentCount(students)
    const classAverage = getClassAverage(students, subjects)
    const subjectAverages = getSubjectAverages(students, subjects)
    const bestSubject = [...subjectAverages].sort((a, b) => b.average - a.average)[0]
    const weakestSubject = [...subjectAverages].sort((a, b) => a.average - b.average)[0]

    return [
      { title: 'Unique Students', value: uniqueStudents },
      { title: 'Class Average', value: `${classAverage.toFixed(1)}%` },
      { title: 'Best Subject', value: formatSubjectLabel(bestSubject.subject) },
      { title: 'Weakest Subject', value: formatSubjectLabel(weakestSubject.subject) },
    ]
  }, [students, subjects])

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
