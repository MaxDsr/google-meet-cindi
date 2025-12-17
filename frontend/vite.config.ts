import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')

  const certPath = env.VITE_TLS_CERT
  const keyPath = env.VITE_TLS_KEY
  const serverHost = env.VITE_SERVER_HOST || 'localhost'

  // Load TLS certificates if available
  const httpsConfig = certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)
    ? {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      }
    : undefined

  if (httpsConfig) {
    console.log('[Vite] TLS certificates loaded, running in HTTPS mode')
    console.log(`[Vite] HMR WebSocket host: ${serverHost}`)
  } else {
    console.log('[Vite] No TLS certificates found, running in HTTP mode')
  }

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      https: httpsConfig,
      hmr: httpsConfig ? {
        host: serverHost,
        protocol: 'wss',
      } : undefined,
      proxy: {
        // Proxy API requests to backend
        '/api': {
          target: httpsConfig ? 'https://localhost:3001' : 'http://localhost:3001',
          changeOrigin: true,
          secure: false, // Allow self-signed certificates in development
        },
        // Proxy Socket.IO WebSocket connections
        '/socket.io': {
          target: httpsConfig ? 'https://localhost:3001' : 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true, // Enable WebSocket proxy
        },
      },
    },
  }
})
