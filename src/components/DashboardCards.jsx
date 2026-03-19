function DashboardCards({ students }) {
  const totalStudents = students.length

  const subjectTotals = {
    mathematics: 0,
    english: 0,
    science: 0,
    socialStudies: 0,
  }

  students.forEach((student) => {
    subjectTotals.mathematics += student.mathematics
    subjectTotals.english += student.english
    subjectTotals.science += student.science
    subjectTotals.socialStudies += student.socialStudies
  })

  const subjectAverages = {
    Mathematics: subjectTotals.mathematics / totalStudents,
    English: subjectTotals.english / totalStudents,
    Science: subjectTotals.science / totalStudents,
    'Social Studies': subjectTotals.socialStudies / totalStudents,
  }

  const classAverage =
    (subjectAverages.Mathematics +
      subjectAverages.English +
      subjectAverages.Science +
      subjectAverages['Social Studies']) /
    4

  const bestSubject = Object.entries(subjectAverages).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0]

  const weakestSubject = Object.entries(subjectAverages).reduce((a, b) =>
    a[1] < b[1] ? a : b
  )[0]

  const cards = [
    { title: 'Total Students', value: totalStudents },
    { title: 'Class Average', value: `${classAverage.toFixed(1)}%` },
    { title: 'Best Subject', value: bestSubject },
    { title: 'Weakest Subject', value: weakestSubject },
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