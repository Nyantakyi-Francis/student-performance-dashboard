import { execFileSync } from 'node:child_process'
import process from 'node:process'

// The hosted frontend always uses its own /api proxy; this is public build configuration.
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  env: { ...process.env, VITE_API_BASE_URL: '/' }, stdio: 'inherit',
})
