import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/lifesync/',   // 👈 THIS LINE FIXES YOUR ISSUE

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    allowedHosts: ['lifesync.dizikloud.top']
  }
})
