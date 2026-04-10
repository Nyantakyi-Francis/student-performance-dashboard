import { getRiskLevel, getStudentAverage } from './analytics'

export function filterStudents(students, subjects, filters, options = {}) {
  const { includeTerm = true } = options
  const normalizedSearch = filters.searchTerm.trim().toLowerCase()

  return students.filter((student) => {
    const average = getStudentAverage(student, subjects)
    const riskLevel = getRiskLevel(average)

    const matchesGrade =
      filters.selectedGrade === 'All' || student.grade === filters.selectedGrade

    const matchesGender =
      filters.selectedGender === 'All' || student.gender === filters.selectedGender

    const matchesRisk =
      filters.selectedRisk === 'All' || riskLevel === filters.selectedRisk

    const matchesSearch =
      normalizedSearch.length === 0 ||
      student.name.toLowerCase().includes(normalizedSearch)

    const matchesSubject =
      filters.selectedSubject === 'All' ||
      Object.prototype.hasOwnProperty.call(
        student.scores || {},
        filters.selectedSubject
      )

    const matchesTerm =
      !includeTerm ||
      filters.selectedTerm === 'All' ||
      (student.term || 'Term 1') === filters.selectedTerm

    return (
      matchesGrade &&
      matchesGender &&
      matchesRisk &&
      matchesSearch &&
      matchesSubject &&
      matchesTerm
    )
  })
}
