import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    commonjsOptions: {
      include: ["tailwind-config.cjs", "node_modules/**"],
    },
  },
  plugins: [react()],
  server: {
    port: 4002,
  },
});
