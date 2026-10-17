import { z } from 'zod'

export const studentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  after: z.coerce.number().int().positive().optional(),
  schoolId: z.coerce.number().int().positive().optional(),
})

export const dashboardDataQuerySchema = z.object({
  schoolId: z.coerce.number().int().positive().optional(),
  schoolSlug: z.string().min(1).max(100).optional(),
}).strict()

export const studentSummarySchema = z.object({
  id: z.number().int().positive(),
  studentNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  preferredName: z.string().nullable(),
  gender: z.string().nullable(),
  status: z.enum(['active', 'inactive', 'withdrawn', 'graduated']),
})

export const studentListResponseSchema = z.object({
  data: z.array(studentSummarySchema),
  page: z.object({
    limit: z.number().int().positive(),
    nextCursor: z.number().int().positive().nullable(),
  }),
})

export const dashboardStudentRecordSchema = z.object({
  id: z.string().min(1),
  studentId: z.number().int().positive(),
  name: z.string().min(1),
  gender: z.string().nullable(),
  grade: z.string().min(1),
  term: z.string().min(1),
  termId: z.number().int().positive(),
  scores: z.record(z.string().min(1), z.number().min(0).max(100).nullable()),
})

export const dashboardDataResponseSchema = z.object({
  data: z.object({
    grades: z.array(z.string().min(1)),
    students: z.array(dashboardStudentRecordSchema),
    subjects: z.array(z.string().min(1)),
    terms: z.array(z.string().min(1)),
  }),
})

export type StudentListQuery = z.infer<typeof studentListQuerySchema>
export type StudentListResponse = z.infer<typeof studentListResponseSchema>
export type DashboardDataQuery = z.infer<typeof dashboardDataQuerySchema>
export type DashboardDataResponse = z.infer<typeof dashboardDataResponseSchema>
