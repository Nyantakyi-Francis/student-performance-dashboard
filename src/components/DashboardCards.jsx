import { formatAverage } from '../utils/scores'
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
        { title: 'Class Average', value: 'No scores' },
        { title: 'Best Subject', value: 'N/A' },
        { title: 'Weakest Subject', value: 'N/A' },
      ]
    }

    const uniqueStudents = getUniqueStudentCount(students)
    const classAverage = getClassAverage(students, subjects)
    const subjectAverages = getSubjectAverages(students, subjects).filter((item) => item.average !== null)
    const bestSubject = [...subjectAverages].sort((a, b) => b.average - a.average)[0]
    const weakestSubject = [...subjectAverages].sort((a, b) => a.average - b.average)[0]

    return [
      { title: 'Unique Students', value: uniqueStudents },
      { title: 'Class Average', value: formatAverage(classAverage) },
      { title: 'Best Subject', value: bestSubject ? formatSubjectLabel(bestSubject.subject) : 'N/A' },
      { title: 'Weakest Subject', value: weakestSubject ? formatSubjectLabel(weakestSubject.subject) : 'N/A' },
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
