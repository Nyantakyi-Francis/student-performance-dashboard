import assert from 'node:assert/strict'
import test from 'node:test'
import { parseScore } from './scores.js'
import { buildStudentExportRows, detectSubjectsFromRows, normalizeStudentRecord, validateImportRows, isValidStudentRecord } from './studentData.js'

const subjects = ['english', 'mathematics']
const row = { studentId: 'student-1', name: 'Ama', grade: '7', gender: 'Female', term: 'Term 1' }

test('score parsing distinguishes blank, zero, decimal, and invalid input', () => {
  for (const value of [null, undefined, '', '  ']) assert.equal(parseScore(value), null)
  for (const value of [0, '0', ' 0 ']) assert.equal(parseScore(value), 0)
  assert.equal(parseScore('95.5'), 95.5)
  assert.equal(parseScore('100'), 100)
  for (const value of ['abc', Infinity, 'Infinity', NaN, -1, 101, true, [], {}]) assert.ok(Number.isNaN(parseScore(value)))
})

test('imports preserve missing scores and exports preserve identity and blanks', () => {
  const student = normalizeStudentRecord({ ...row, english: '0', mathematics: '' }, subjects)
  assert.equal(student.studentId, 'student-1')
  assert.deepEqual(student.scores, { english: 0, mathematics: null })
  assert.ok(isValidStudentRecord(student))
  const exported = buildStudentExportRows([student], subjects)
  assert.equal(exported[0].studentId, 'student-1')
  assert.equal(exported[0].Mathematics, '')
  const imported = validateImportRows(exported, subjects)
  assert.deepEqual(imported.students[0].scores, student.scores)
  assert.equal(imported.students[0].studentId, student.studentId)
  assert.deepEqual(detectSubjectsFromRows(exported), subjects)
})

test('invalid imports report each row and reject the entire file', () => {
  const result = validateImportRows([
    { ...row, english: 80 },
    { ...row, studentId: 'student-2', english: 'bad', mathematics: 101 },
    { ...row, studentId: 'student-3', name: '', english: -1 },
  ], subjects)
  assert.deepEqual(result.students, [])
  assert.equal(result.errors.length, 4)
  assert.ok(result.errors.some((error) => error.startsWith('Row 3: English')))
  assert.ok(result.errors.some((error) => error.startsWith('Row 4: name')))
  assert.equal(isValidStudentRecord(normalizeStudentRecord({ ...row, english: 'bad' }, subjects)), false)
})

test('same-name students stay separate and duplicate identity-term pairs are rejected', () => {
  const result = validateImportRows([{ ...row }, { ...row, studentId: '' }], subjects)
  assert.equal(result.errors.length, 0)
  assert.notEqual(result.students[0].studentId, result.students[1].studentId)
  assert.equal(validateImportRows([{ ...row }, { ...row }], subjects).students.length, 0)
  assert.equal(validateImportRows([{ ...row }, { ...row, term: 'Term 2' }], subjects).students.length, 2)
})


test('camel-case subject keys and Student ID headers are normalized consistently', () => {
  const rows = [{ 'Student ID': 'a', name: 'Ama', gender: 'Female', grade: '7', socialStudies: 90 }]
  assert.deepEqual(detectSubjectsFromRows(rows), ['socialStudies'])
  const result = validateImportRows(rows, ['socialStudies'])
  assert.equal(result.students[0].studentId, 'a')
  assert.equal(result.students[0].scores.socialStudies, 90)
})
