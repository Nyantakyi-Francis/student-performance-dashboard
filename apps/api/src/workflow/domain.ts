import { z } from 'zod'

export const id = z.number().int().positive().safe()
export const policyInput = z.object({
  passMark: z.number().min(0).max(100), goodMark: z.number().min(0).max(100), excellentMark: z.number().min(0).max(100),
  minimumScores: z.number().int().min(1).max(500),
}).strict().refine((p) => p.passMark < p.goodMark && p.goodMark < p.excellentMark, 'Thresholds must increase: pass, good, excellent.')
export type Policy = z.infer<typeof policyInput>
export const defaultPolicy: Policy = { passMark: 50, goodMark: 60, excellentMark: 80, minimumScores: 1 }
export const scoreInput = z.object({ enrollmentId: id, status: z.enum(['scored', 'missing', 'excused', 'incomplete']), points: z.number().min(0).max(99999.99).nullable(), feedback: z.string().trim().max(2000).default('') }).strict()
export type ScoreInput = z.infer<typeof scoreInput>
export const saveInput = z.object({ version: id, reason: z.string().trim().max(500).default(''), rows: z.array(scoreInput).min(1).max(500) }).strict()
export function validateRows(rows: ScoreInput[], roster: Set<number>, maximum: number) {
  const seen = new Set<number>()
  return rows.flatMap((row, i) => {
    const errors: string[] = []
    if (!roster.has(row.enrollmentId)) errors.push('Student is not enrolled in this class.')
    if (seen.has(row.enrollmentId)) errors.push('Duplicate enrollment.')
    seen.add(row.enrollmentId)
    if (row.status === 'scored' ? row.points === null || row.points > maximum : row.points !== null) errors.push(`Scored work needs points from 0 to ${maximum}; other states need blank points.`)
    return errors.map((message) => ({ row: i + 2, message }))
  })
}
export function calculateResult(items: { points: number | null; maximumScore: number; weight: number; status: string }[], policy: Policy) {
  const recorded = items.filter((s) => s.status === 'scored' && s.points !== null && s.weight > 0)
  const weights = recorded.reduce((sum, s) => sum + s.weight, 0)
  const average = recorded.length >= policy.minimumScores && weights > 0 ? recorded.reduce((sum, s) => sum + s.points! / s.maximumScore * 100 * s.weight, 0) / weights : null
  return { average, recordedCount: recorded.length, assessmentCount: items.length, weightDenominator: weights,
    risk: average === null ? 'Insufficient evidence' : average >= policy.excellentMark ? 'Excellent' : average >= policy.goodMark ? 'Good' : average >= policy.passMark ? 'Average' : 'At Risk',
    passed: average === null ? null : average >= policy.passMark,
  }
}
