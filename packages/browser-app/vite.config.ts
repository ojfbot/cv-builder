import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // Module Federation REMOTE — exposes cv-builder Dashboard to the shell host.
    // Shell consumes: cv_builder@http://localhost:3000/assets/remoteEntry.js
    federation({
      name: 'cv_builder',
      filename: 'remoteEntry.js',
      exposes: {
        './Dashboard': './src/components/Dashboard',
      },
      shared: ['react', 'react-dom', '@reduxjs/toolkit', 'react-redux'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    cors: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: true  // Allow all hosts (workaround for Vite bug in 6.0.9+)
  },
  build: {
    // Module Federation requires non-legacy chunk format
    target: 'esnext',
    minify: false,
  },
})
