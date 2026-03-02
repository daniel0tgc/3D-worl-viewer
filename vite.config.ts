import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [
    react(),
    cesium(),
  ],
  server: {
    proxy: {
      // NYC DOT webcams JSON API has no CORS headers — this dev-server proxy
      // forwards the request server-side so the browser never hits the CORS check.
      '/proxy/nyctmc': {
        target: 'https://webcams.nyctmc.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/nyctmc/, ''),
      },
    },
  },
})
