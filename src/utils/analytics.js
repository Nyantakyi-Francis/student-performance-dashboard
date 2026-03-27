export function getStudentAverage(student, subjects) {
  if (!subjects.length) return 0

  const total = subjects.reduce((sum, subject) => {
    return sum + (student.scores?.[subject] ?? 0)
  }, 0)

  return total / subjects.length
}

export function getRiskLevel(average) {
  if (average >= 80) return 'Excellent'
  if (average >= 60) return 'Good'
  if (average >= 50) return 'Average'
  return 'At Risk'
}