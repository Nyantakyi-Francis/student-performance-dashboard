export function getStudentAverage(student, subjects) {
  if (!subjects.length) return 0

  const total = subjects.reduce((sum, subject) => {
    return sum + Number(student.scores?.[subject] ?? 0)
  }, 0)

  return total / subjects.length
}

export function getRiskLevel(average) {
  if (average >= 80) return 'Excellent'
  if (average >= 60) return 'Good'
  if (average >= 50) return 'Average'
  return 'At Risk'
}

export function getUniqueStudentCount(students) {
  return new Set(
    students.map((student) => `${student.name.toLowerCase()}::${student.grade}`)
  ).size
}

export function getSubjectAverages(students, subjects) {
  if (!students.length || !subjects.length) return []

  return subjects.map((subject) => {
    const total = students.reduce((sum, student) => {
      return sum + Number(student.scores?.[subject] ?? 0)
    }, 0)

    return {
      subject,
      average: total / students.length,
    }
  })
}

export function getClassAverage(students, subjects) {
  const subjectAverages = getSubjectAverages(students, subjects)
  if (!subjectAverages.length) return 0

  return (
    subjectAverages.reduce((sum, subject) => sum + subject.average, 0) /
    subjectAverages.length
  )
}

export function getTermPerformance(students, subjects, terms = []) {
  if (!students.length || !subjects.length) return []

  const orderedTerms =
    terms.length > 0
      ? terms
      : [...new Set(students.map((student) => student.term || 'Term 1'))]

  return orderedTerms
    .map((term) => {
      const termStudents = students.filter(
        (student) => (student.term || 'Term 1') === term
      )

      if (!termStudents.length) return null

      return {
        term,
        average:
          termStudents.reduce(
            (sum, student) => sum + getStudentAverage(student, subjects),
            0
          ) / termStudents.length,
        count: termStudents.length,
      }
    })
    .filter(Boolean)
}

export function getImprovementLeaders(students, subjects, terms = []) {
  if (!students.length || !subjects.length) {
    return {
      changes: [],
      largestDrop: null,
      mostImproved: null,
    }
  }

  const orderedTerms =
    terms.length > 0
      ? terms
      : [...new Set(students.map((student) => student.term || 'Term 1'))]

  const termOrder = new Map(orderedTerms.map((term, index) => [term, index]))
  const groupedStudents = new Map()

  students.forEach((student) => {
    const key = `${student.name.toLowerCase()}::${student.grade}`
    const record = {
      average: getStudentAverage(student, subjects),
      endTerm: student.term || 'Term 1',
      grade: student.grade,
      name: student.name,
    }

    if (!groupedStudents.has(key)) {
      groupedStudents.set(key, [])
    }

    groupedStudents.get(key).push(record)
  })

  const changes = [...groupedStudents.values()]
    .map((records) => {
      const sortedRecords = [...records].sort((a, b) => {
        return (
          (termOrder.get(a.endTerm) ?? Number.MAX_SAFE_INTEGER) -
          (termOrder.get(b.endTerm) ?? Number.MAX_SAFE_INTEGER)
        )
      })

      if (sortedRecords.length < 2) return null

      const firstRecord = sortedRecords[0]
      const lastRecord = sortedRecords[sortedRecords.length - 1]

      return {
        change: Number((lastRecord.average - firstRecord.average).toFixed(1)),
        endAverage: lastRecord.average,
        endTerm: lastRecord.endTerm,
        grade: firstRecord.grade,
        name: firstRecord.name,
        startAverage: firstRecord.average,
        startTerm: firstRecord.endTerm,
      }
    })
    .filter(Boolean)

  if (!changes.length) {
    return {
      changes: [],
      largestDrop: null,
      mostImproved: null,
    }
  }

  const mostImproved = [...changes].sort((a, b) => b.change - a.change)[0]
  const largestDrop = [...changes].sort((a, b) => a.change - b.change)[0]

  return {
    changes,
    largestDrop,
    mostImproved,
  }
}
