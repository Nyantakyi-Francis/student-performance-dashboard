import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { z } from 'zod'

const localEnvPath = resolve(process.cwd(), '.env')

if (existsSync(localEnvPath)) {
  loadEnvFile(localEnvPath)
}

const environmentSchema = z.object({
  API_HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
  CLIENT_ORIGIN: z
    .string()
    .min(1)
    .default('http://localhost:5173,http://127.0.0.1:5173'),
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).optional(),
})

export type AppConfig = Omit<z.infer<typeof environmentSchema>, 'PORT'> & {
  API_PORT: number
}

export function parseConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const result = environmentSchema.safeParse(environment)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ')

    throw new Error(`Invalid API configuration: ${issues}`)
  }

  const { PORT: providerPort, ...config } = result.data

  return {
    ...config,
    API_PORT: config.API_PORT ?? providerPort ?? 3001,
  }
}
