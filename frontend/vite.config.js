import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import version from '../config/version.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
