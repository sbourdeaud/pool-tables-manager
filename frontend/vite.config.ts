import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function gitOutput(args: string[]) {
  try {
    return execFileSync('git', args, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    }).trim()
  } catch {
    return null
  }
}

function frontendBuild() {
  const suppliedCommit = process.env.BUILD_COMMIT_SHA?.trim()
  const suppliedStatus = process.env.BUILD_GIT_STATUS?.trim().toLowerCase()

  if (suppliedCommit && !/^[a-f\d]{7,64}$/i.test(suppliedCommit)) {
    throw new Error('BUILD_COMMIT_SHA must be a hexadecimal commit SHA (7–64 characters)')
  }
  if (suppliedStatus && !['clean', 'dirty', 'unknown'].includes(suppliedStatus)) {
    throw new Error('BUILD_GIT_STATUS must be clean, dirty, or unknown')
  }

  const gitCommit = gitOutput(['rev-parse', '--verify', 'HEAD'])
  const gitChanges = gitOutput(['status', '--porcelain', '--untracked-files=normal'])
  const commit = suppliedCommit?.toLowerCase() || gitCommit
  let status = 'unknown'

  if (gitChanges || suppliedStatus === 'dirty') {
    status = 'dirty'
  } else if (suppliedStatus) {
    status = suppliedStatus === 'clean' && !commit ? 'unknown' : suppliedStatus
  } else if (gitChanges === '' && gitCommit && commit === gitCommit) {
    status = 'clean'
  }

  return { builtAt: new Date().toISOString(), commit, status }
}

// Multi-page build served directly by Express from backend/public/:
//   /            staff SPA (React Router)
//   /tableN      player-facing table app (server maps /table:number -> table.html)
//   /status      public live status board
export default defineConfig(() => ({
  plugins: [react()],
  define: {
    __FRONTEND_BUILD__: JSON.stringify(frontendBuild()),
  },
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/vendor': 'http://localhost:3000',
    },
  },
  build: {
    outDir: '../backend/public',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        table: path.resolve(__dirname, 'table.html'),
        status: path.resolve(__dirname, 'status.html'),
      },
    },
  },
}))
