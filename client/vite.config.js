import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(), // 🌟 මේ පේළිය අලුතින් එකතු කළා
  ],
  define: {
    global: 'window',
  },
})