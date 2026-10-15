import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    base: env.VITE_BASE_NAME || '/',
    build: {
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor-pdf',
                test: /node_modules[\\/](?:html2pdf\.js|jspdf|html2canvas|es6-promise|canvg)/,
              },
              {
                name: 'vendor-quill',
                test: /node_modules[\\/](?:quill|react-quill)/,
              },
              {
                name: 'vendor-react',
                test: /node_modules[\\/](?:react|react-dom|react-router)/,
              },
              {
                name: 'vendor-others',
                test: /node_modules/,
              }
            ]
          }
        }
      }
    }
  }
})



