import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// DEPLOYMENT NOTE:
// - GitHub Pages (subdirectory): base = '/aptiv-bookkeeping-crm/'  ← default
// - Custom domain (root):        set VITE_BASE_PATH=/ in your env or GitHub Secret
// This means moving to a custom domain requires zero code changes — just update the env var.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/aptiv-bookkeeping-crm/',
})
