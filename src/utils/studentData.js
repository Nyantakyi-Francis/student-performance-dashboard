import { DEFAULT_TERM, formatSubjectLabel } from '../data/config.js'
import { createId } from './ids.js'

import { parseScore, isRecordedScore } from './scores.js'

const RESERVED_FIELDS = ['id', 'studentId', 'name', 'gender', 'grade', 'term']

export function normalizeKey(value) {
  const clean = String(value || '').trim()
  if (!clean) return ''

  return clean
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
}

export function createEmptyScores(subjects) {
  return subjects.reduce((accumulator, subject) => {
    accumulator[subject] = ''
    return accumulator
  }, {})
}

export function detectSubjectsFromRows(rows, existingSubjects = []) {
  const detectedSubjects = new Set(existingSubjects)

  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return

    Object.keys(row).forEach((key) => {
      const normalized = normalizeKey(key)
      if (!normalized || RESERVED_FIELDS.includes(normalized)) return
      detectedSubjects.add(normalized)
    })
  })

  return Array.from(detectedSubjects)
}

export function getRowValueByNormalizedKey(row, targetKey) {
  if (!row || typeof row !== 'object') return undefined

  const directMatch = row[targetKey]
  if (directMatch !== undefined) return directMatch

  const entry = Object.entries(row).find(
    ([key]) => normalizeKey(key) === targetKey
  )

  return entry ? entry[1] : undefined
}

export function normalizeStudentRecord(row, allSubjects, termOptions = []) {
  const scoreObject = {}

  allSubjects.forEach((subject) => {
    const rawValue = getRowValueByNormalizedKey(row, subject)
    scoreObject[subject] = parseScore(rawValue)
  })

  return {
    id: createId(),
    studentId: String(getRowValueByNormalizedKey(row, 'studentId') ?? '').trim() || createId(),
    name: String(getRowValueByNormalizedKey(row, 'name') ?? '').trim(),
    gender: String(getRowValueByNormalizedKey(row, 'gender') ?? '').trim(),
    grade: String(getRowValueByNormalizedKey(row, 'grade') ?? '').trim(),
    term:
      String(getRowValueByNormalizedKey(row, 'term') ?? '').trim() ||
      (termOptions[0] || DEFAULT_TERM),
    scores: scoreObject,
  }
}

export function isValidStudentRecord(student) {
  const scoreValues = Object.values(student.scores)

  return (
    student.name &&
    student.gender &&
    student.grade &&
    student.term &&
    scoreValues.every((score) => score === null || isRecordedScore(score))
  )
}

// Validate the entire file before the caller changes the dataset.
export function validateImportRows(rows, subjects, terms = []) {
  const students = []
  const errors = []
  const seen = new Set()
  rows.forEach((row, index) => {
    const student = normalizeStudentRecord(row, subjects, terms)
    const rowNumber = row.__rowNum__ == null ? index + 2 : row.__rowNum__ + 1
    for (const field of ['name', 'gender', 'grade']) {
      if (!student[field]) errors.push(`Row ${rowNumber}: ${field} is required.`)
    }
    for (const subject of subjects) {
      if (student.scores[subject] !== null && !isRecordedScore(student.scores[subject])) {
        errors.push(`Row ${rowNumber}: ${formatSubjectLabel(subject)} must be a number between 0 and 100, or blank.`)
      }
    }
    const key = JSON.stringify([student.studentId, student.term])
    if (seen.has(key)) errors.push(`Row ${rowNumber}: duplicate student ID and term.`)
    seen.add(key)
    students.push(student)
  })
  return { students: errors.length ? [] : students, errors }
}

export function buildStudentExportRows(students, subjects) {
  return students.map((student) => {
    const row = {
      studentId: student.studentId ?? student.id,
      name: student.name,
      gender: student.gender,
      grade: student.grade,
      term: student.term || DEFAULT_TERM,
    }

    subjects.forEach((subject) => {
      row[formatSubjectLabel(subject)] = parseScore(student.scores?.[subject]) ?? ''
    })

    return row
  })
}

export function buildTemplateRows(subjects, grades = [], terms = []) {
  const templateRow = {
    studentId: 'demo-student-001',
    name: 'Ama Mensah',
    gender: 'Female',
    grade: grades[0] || 'Grade 7',
    term: terms[0] || DEFAULT_TERM,
  }

  subjects.forEach((subject, index) => {
    templateRow[formatSubjectLabel(subject)] = Math.max(60, 88 - index * 5)
  })

  return [templateRow]
}

export function downloadBlobFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
