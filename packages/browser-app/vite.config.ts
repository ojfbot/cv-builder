import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // Module Federation REMOTE — exposes cv-builder Dashboard to the shell host.
    // Shell dev:  cv_builder@http://localhost:3000/assets/remoteEntry.js
    // Shell prod: shell reads VITE_REMOTE_CV_BUILDER env var — set in shell/packages/shell-app/vite.config.ts.
    // See docs/FEDERATION.md for full integration guide.
    federation({
      name: 'cv_builder',
      filename: 'remoteEntry.js',
      exposes: {
        './Dashboard': './src/components/Dashboard',
      },
      // @carbon/react must be shared to avoid duplicate copies (style conflicts, inflated bundle).
      // Shell must pin the same major version (^1.x). See docs/FEDERATION.md.
      shared: ['react', 'react-dom', '@reduxjs/toolkit', 'react-redux', '@carbon/react'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    // Scoped to the shell host origin; avoids exposing the remote entry to arbitrary local pages.
    // Add production shell origin (https://app.jim.software) for staging/prod dev servers.
    cors: { origin: ['http://localhost:4000', 'http://127.0.0.1:4000'] },
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
    // minify: false is required — @originjs/vite-plugin-federation mangles federation
    // placeholder identifiers (__federation_expose_*, __federation_shared_*) under
    // esbuild/terser. Tracked in: https://github.com/ojfbot/cv-builder/issues/99
    // Re-evaluate when upgrading vite-plugin-federation past 1.4.x.
    minify: false,
  },
})
