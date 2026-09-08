import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Served from https://<user>.github.io/Todo-app/ via GitHub Pages.
export default defineConfig({
  base: '/Todo-app/',
  plugins: [react()],
})
