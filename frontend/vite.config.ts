import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Multi-page build served directly by Express from backend/public/:
//   /            staff SPA (React Router)
//   /tableN      player-facing table app (server maps /table:number -> table.html)
//   /status      public live status board
export default defineConfig({
  plugins: [react()],
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
})
