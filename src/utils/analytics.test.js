import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getClassAverage,
  getImprovementLeaders,
  getTermPerformance,
} from './analytics.js'

const subjects = ['english', 'mathematics']
const terms = ['Term 1', 'Term 2', 'Term 3']

const students = [
  {
    id: 1,
    name: 'Ama Mensah',
    grade: 'Grade 7',
    term: 'Term 1',
    scores: { english: 70, mathematics: 74 },
  },
  {
    id: 2,
    name: 'Ama Mensah',
    grade: 'Grade 7',
    term: 'Term 2',
    scores: { english: 76, mathematics: 80 },
  },
  {
    id: 3,
    name: 'Ama Mensah',
    grade: 'Grade 7',
    term: 'Term 3',
    scores: { english: 84, mathematics: 86 },
  },
  {
    id: 4,
    name: 'Kwame Asare',
    grade: 'Grade 7',
    term: 'Term 1',
    scores: { english: 60, mathematics: 62 },
  },
  {
    id: 5,
    name: 'Kwame Asare',
    grade: 'Grade 7',
    term: 'Term 2',
    scores: { english: 58, mathematics: 61 },
  },
  {
    id: 6,
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
