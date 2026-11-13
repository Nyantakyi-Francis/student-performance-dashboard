import { describe, expect, it } from 'vitest'
import { calculateResult, defaultPolicy, policyInput, validateRows } from './domain.js'

describe('grading and import rules', () => {
  it('weights normalized recorded scores and keeps zero distinct from missing', () => {
    const result = calculateResult([
      { points: 0, maximumScore: 20, weight: 1, status: 'scored' },
      { points: 90, maximumScore: 100, weight: 3, status: 'scored' },
      { points: null, maximumScore: 100, weight: 10, status: 'missing' },
      { points: 100, maximumScore: 100, weight: 0, status: 'scored' },
    ], defaultPolicy)
    expect(result).toMatchObject({ average: 67.5, recordedCount: 2, assessmentCount: 4, weightDenominator: 4, risk: 'Good', passed: true })
  })
  it('requires enough recorded evidence and ordered policy thresholds', () => {
    expect(calculateResult([{ points: 100, maximumScore: 100, weight: 1, status: 'scored' }], { ...defaultPolicy, minimumScores: 2 }).average).toBeNull()
    expect(calculateResult([], defaultPolicy).risk).toBe('Insufficient evidence')
    expect(policyInput.safeParse({ ...defaultPolicy, passMark: 80 }).success).toBe(false)
  })
  it('reports all duplicate, roster and score-state errors', () => {
    const errors = validateRows([
      { enrollmentId: 1, status: 'scored', points: 101, feedback: '' },
      { enrollmentId: 1, status: 'missing', points: 0, feedback: '' },
      { enrollmentId: 9, status: 'scored', points: null, feedback: '' },
    ], new Set([1]), 100)
    expect(errors).toHaveLength(5)
    expect(errors.map((e) => e.row)).toEqual([2, 3, 3, 4, 4])
  })
})
