import { z } from 'zod'
import { apiRequest } from './dashboard'

const id = z.number().int().positive()
const entity = z.object({ id, name: z.string() })
export const policySchema = z.object({ id: id.nullable(), version: z.number(), passMark: z.number(), goodMark: z.number(), excellentMark: z.number(), minimumScores: z.number() })
const assessmentSchema = z.object({ id, title: z.string(), classGroupId: id, subjectId: id, termId: id, maximumScore: z.string(), weight: z.string(), assessedOn: z.string(), version: id, status: z.string(), publishedAt: z.string().nullable() })
export const workspaceSchema = z.object({
  classes: z.array(entity.extend({ academicYearId: id })), subjects: z.array(entity),
  terms: z.array(entity.extend({ academicYearId: id, startsOn: z.string(), endsOn: z.string(), status: z.string() })),
  assignments: z.array(z.object({ classGroupId: id, subjectId: id })), assessments: z.array(assessmentSchema), policy: policySchema,
})
export const rowSchema = z.object({ enrollmentId: id, studentId: id, studentNumber: z.string(), name: z.string(), status: z.enum(['scored', 'missing', 'excused', 'incomplete']), points: z.number().nullable(), feedback: z.string() })
export const detailSchema = z.object({ assessment: assessmentSchema, rows: z.array(rowSchema) })
export const reportsSchema = z.array(z.object({ studentId: id, name: z.string(), studentNumber: z.string(), items: z.array(z.object({ title: z.string(), term: z.string(), subject: z.string(), points: z.number().nullable(), maximumScore: z.number(), status: z.string(), feedback: z.string(), weight: z.number(), policy: policySchema, assessmentVersion: id, publishedAt: z.string() })), totals: z.array(z.object({ term: z.string(), subject: z.string(), policyVersion: id, average: z.number().nullable(), recordedCount: z.number(), assessmentCount: z.number(), weightDenominator: z.number(), risk: z.string(), passed: z.boolean().nullable() })) }))
export const accountsSchema = z.object({ accounts: z.array(z.object({ id, email: z.string(), displayName: z.string(), role: z.string(), status: z.string() })), students: z.array(z.object({ id, firstName: z.string(), lastName: z.string(), studentNumber: z.string() })), requests: z.array(z.object({ membershipId: id })), events: z.array(z.object({ id, action: z.string(), targetId: z.string().nullable(), createdAt: z.string() })) })
export type WorkspaceData = z.infer<typeof workspaceSchema>
export type ScoreRow = z.infer<typeof rowSchema>
export type Detail = z.infer<typeof detailSchema>
export type Report = z.infer<typeof reportsSchema>[number]
export async function readData<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await apiRequest(path, { signal })
  const result = schema.safeParse(response.data)
  if (!result.success) throw new Error('School records could not be loaded. Please try again.')
  return result.data
}
export async function writeData(path: string, body: unknown = {}) {
  return apiRequest(path, { method: 'POST', body })
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'The request could not be completed.' }
