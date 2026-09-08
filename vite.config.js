import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Relative asset paths so one build works whether the site is served from a
// domain root (Netlify, Cloudflare Pages) or a subpath (GitHub Pages project
// site at /Todo-app/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
