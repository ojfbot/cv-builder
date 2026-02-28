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
      // Object form enforces singleton + version constraints — mismatches surface as warnings
      // rather than silent duplicate instances. See docs/FEDERATION.md for shell version table.
      shared: {
        react:              { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom':        { singleton: true, requiredVersion: '^18.3.1' },
        '@reduxjs/toolkit': { singleton: true, requiredVersion: '^2.11.0' },
        'react-redux':      { singleton: true, requiredVersion: '^9.2.0' },
        '@carbon/react':    { singleton: true, requiredVersion: '^1.67.0' },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    // Scoped to the shell host origin. Set SHELL_ORIGIN for staging/preview environments.
    // Not VITE_-prefixed — this is a server-side build var, never injected into the bundle.
    // See .env.example for usage.
    cors: {
      origin: process.env.SHELL_ORIGIN
        ? [process.env.SHELL_ORIGIN]
        : ['http://localhost:4000', 'http://127.0.0.1:4000'],
    },
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
