import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getClassAverage,
  getStudentAverage,
  getSubjectAverages,
  getRiskLevel,
  getUniqueStudentCount,
  getImprovementLeaders,
  getTermPerformance,
} from './analytics.js'

const subjects = ['english', 'mathematics']
const terms = ['Term 1', 'Term 2', 'Term 3']

const students = [
  {
    id: 1,
    studentId: 'ama',
    name: 'Ama Mensah',
    grade: 'Grade 7',
    term: 'Term 1',
    scores: { english: 70, mathematics: 74 },
  },
  {
    id: 2,
    studentId: 'ama',
    name: 'Ama Mensah',
    grade: 'Grade 7',
    term: 'Term 2',
    scores: { english: 76, mathematics: 80 },
  },
  {
    id: 3,
    studentId: 'ama',
    name: 'Ama Mensah',
    grade: 'Grade 7',
    term: 'Term 3',
    scores: { english: 84, mathematics: 86 },
  },
  {
    id: 4,
    studentId: 'kwame',
    name: 'Kwame Asare',
    grade: 'Grade 7',
    term: 'Term 1',
    scores: { english: 60, mathematics: 62 },
  },
  {
    id: 5,
    studentId: 'kwame',
    name: 'Kwame Asare',
    grade: 'Grade 7',
    term: 'Term 2',
    scores: { english: 58, mathematics: 61 },
  },
  {
    id: 6,
    studentId: 'kwame',
    name: 'Kwame Asare',
    grade: 'Grade 7',
    term: 'Term 3',
    scores: { english: 55, mathematics: 57 },
  },
]

test('getClassAverage returns the average across visible subjects', () => {
  const average = getClassAverage(students, subjects)

  assert.ok(Math.abs(average - 68.58333333333333) < 0.000001)
})

test('getTermPerformance returns ordered term averages', () => {
  const termPerformance = getTermPerformance(students, subjects, terms)

  assert.equal(termPerformance.length, 3)
  assert.equal(termPerformance[0].term, 'Term 1')
  assert.equal(termPerformance[1].average, 68.75)
  assert.equal(termPerformance[2].count, 2)
})

test('getImprovementLeaders returns the strongest gain and decline', () => {
  const { mostImproved, largestDrop } = getImprovementLeaders(
    students,
    subjects,
    terms
  )

  assert.equal(mostImproved.name, 'Ama Mensah')
  assert.equal(mostImproved.change, 13)
  assert.equal(largestDrop.name, 'Kwame Asare')
  assert.equal(largestDrop.change, -5)
})


test('averages exclude missing scores and retain numeric zero', () => {
  assert.equal(getStudentAverage({ scores: { english: 0, mathematics: null } }, subjects), 0)
  assert.equal(getStudentAverage({ scores: { english: 80, mathematics: '' } }, subjects), 80)
  assert.equal(getStudentAverage({ scores: {} }, subjects), null)
  assert.equal(getStudentAverage({ scores: { english: NaN, mathematics: Infinity } }, subjects), null)
  assert.equal(getRiskLevel(null), 'No scores')
  assert.equal(getRiskLevel(0), 'At Risk')
  const records = [{ scores: { english: 80 } }, { scores: { english: 0, mathematics: null } }]
  assert.deepEqual(getSubjectAverages(records, subjects), [
    { subject: 'english', average: 40, count: 2 },
    { subject: 'mathematics', average: null, count: 0 },
  ])
  assert.equal(getClassAverage(records, subjects), 40)
  assert.equal(getClassAverage([], subjects), null)
})

test('stable identities distinguish namesakes and survive name and grade changes', () => {
  const records = [
    { id: 'a1', studentId: 'a', name: 'Same Name', grade: '7', term: 'Term 1', scores: { english: 50 } },
    { id: 'b1', studentId: 'b', name: 'Same Name', grade: '7', term: 'Term 2', scores: { english: 90 } },
    { id: 'a2', studentId: 'a', name: 'Changed Name', grade: '8', term: 'Term 3', scores: { english: 70 } },
  ]
  assert.equal(getUniqueStudentCount(records), 2)
  const result = getImprovementLeaders(records, subjects, terms)
  assert.equal(result.changes.length, 1)
  assert.equal(result.mostImproved.change, 20)
  assert.equal(getUniqueStudentCount(records.map((record) => ({ ...record, studentId: undefined }))), 3)
})

test('term averages and progress omit records without scores', () => {
  const records = [
    { id: '1', studentId: 'a', term: 'Term 1', scores: {} },
    { id: '2', studentId: 'a', term: 'Term 2', scores: { english: 0 } },
  ]
  assert.deepEqual(getTermPerformance(records, subjects, terms), [{ term: 'Term 2', average: 0, count: 1 }])
  assert.equal(getImprovementLeaders(records, subjects, terms).changes.length, 0)
})


test('legacy record IDs never merge namesakes and duplicate terms do not create progress', () => {
  const records = [
    { id: '1', name: 'Same Name', grade: '7', term: 'Term 1', scores: { english: 50 } },
    { id: '2', name: 'Same Name', grade: '7', term: 'Term 2', scores: { english: 90 } },
  ]
  assert.equal(getUniqueStudentCount(records), 2)
  assert.equal(getImprovementLeaders(records, subjects, terms).changes.length, 0)
  assert.equal(getImprovementLeaders(records.map((record) => ({ ...record, studentId: 'a', term: 'Term 1' })), subjects, terms).changes.length, 0)
})
