import { DEFAULT_TERM } from '../data/config.js'
import { parseScore, isRecordedScore } from './scores.js'

function mean(values) {
  const recorded = values.filter(isRecordedScore)
  return recorded.length ? recorded.reduce((sum, value) => sum + value, 0) / recorded.length : null
}

export function getStudentIdentity(student) {
  return String(student.studentId ?? student.id)
}

export function getStudentAverage(student, subjects) {
  return mean(subjects.map((subject) => parseScore(student.scores?.[subject])))
}

export function getRiskLevel(average) {
  if (average == null) return 'No scores'
  if (average >= 80) return 'Excellent'
  if (average >= 60) return 'Good'
  if (average >= 50) return 'Average'
  return 'At Risk'
}

export function getUniqueStudentCount(students) {
  return new Set(
    students.map(getStudentIdentity)
  ).size
}

export function getSubjectAverages(students, subjects) {
  if (!students.length || !subjects.length) return []

  return subjects.map((subject) => {
    const scores = students.map((student) => parseScore(student.scores?.[subject]))
    return { subject, average: mean(scores), count: scores.filter(isRecordedScore).length }
  })
}

export function getClassAverage(students, subjects) {
  // Retain equal weighting per subject, excluding subjects with no recorded scores.
  return mean(getSubjectAverages(students, subjects).map((subject) => subject.average))
}

export function getTermPerformance(students, subjects, terms = []) {
  if (!students.length || !subjects.length) return []

  const orderedTerms =
    terms.length > 0
      ? terms
      : [...new Set(students.map((student) => student.term || DEFAULT_TERM))]

  return orderedTerms
    .map((term) => {
      const termStudents = students.filter(
        (student) => (student.term || DEFAULT_TERM) === term && getStudentAverage(student, subjects) !== null
      )

      if (!termStudents.length) return null

      return {
        term,
        average: mean(termStudents.map((student) => getStudentAverage(student, subjects))),
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
      : [...new Set(students.map((student) => student.term || DEFAULT_TERM))]

  const termOrder = new Map(orderedTerms.map((term, index) => [term, index]))
  const groupedStudents = new Map()

  students.forEach((student) => {
    const key = getStudentIdentity(student)
    if (getStudentAverage(student, subjects) === null) return
    const record = {
      average: getStudentAverage(student, subjects),
      endTerm: student.term || DEFAULT_TERM,
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
      if (new Set(sortedRecords.map((record) => record.endTerm)).size !== sortedRecords.length) return null

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
