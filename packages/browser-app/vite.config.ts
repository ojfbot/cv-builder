import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'
import path from 'path'
import { readFileSync } from 'fs'

// Read version specifiers from package.json files so federation shared config
// stays in sync automatically when deps are bumped — eliminates silent drift.
function dep(pkgPath: string, name: string): string {
  const pkg = JSON.parse(readFileSync(path.resolve(__dirname, pkgPath), 'utf8'))
  const version = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]
  if (!version) {
    throw new Error(`dep(): "${name}" not found in ${pkgPath} — check spelling or package location`)
  }
  return version
}
// browser-app owns: react, react-dom, @carbon/react
// root workspace owns: @reduxjs/toolkit, react-redux
const appPkg  = './package.json'
const rootPkg = '../../package.json'

export default defineConfig({
  plugins: [
    react(),
    // cssInjectedByJs must come before federation — it intercepts CSS extraction and
    // converts it to JS style-injection, so the exposed Dashboard module carries its
    // own styles and applies them automatically when the shell mounts the remote.
    // jsAssetsFilterFunction scopes injection to our exposed bundles only — without
    // it the plugin picks a shared chunk (react-dom) that the shell never loads
    // (singleton already provided by host), so CSS would never execute.
    //
    // The `__federation_expose_` prefix is @originjs/vite-plugin-federation's internal
    // chunk naming convention (verified at v1.4.x). If CSS stops loading after a plugin
    // upgrade, check dist/ chunk names and update these strings accordingly.
    cssInjectedByJs({
      jsAssetsFilterFunction: ({ fileName }) =>
        fileName.includes('__federation_expose_Dashboard') ||
        fileName.includes('__federation_expose_Settings'),
    }),
    // Module Federation REMOTE — exposes Resume Builder Dashboard to the shell host.
    // Shell dev:  resume_builder@http://localhost:3000/assets/remoteEntry.js
    // Shell prod: shell reads VITE_REMOTE_RESUME_BUILDER env var — set in shell/packages/shell-app/vite.config.ts.
    // See docs/FEDERATION.md for full integration guide.
    federation({
      name: 'resume_builder',
      filename: 'remoteEntry.js',
      exposes: {
        './Dashboard': './src/components/Dashboard',
        './Settings': './src/components/settings/SettingsPanel',
      },
      // Object form enforces singleton + version constraints — mismatches surface as warnings
      // rather than silent duplicate instances. See docs/FEDERATION.md for shell version table.
      shared: {
        react:              { singleton: true, requiredVersion: dep(appPkg,  'react') },
        'react-dom':        { singleton: true, requiredVersion: dep(appPkg,  'react-dom') },
        '@reduxjs/toolkit': { singleton: true, requiredVersion: dep(rootPkg, '@reduxjs/toolkit') },
        'react-redux':      { singleton: true, requiredVersion: dep(rootPkg, 'react-redux') },
        '@carbon/react':    { singleton: true, requiredVersion: dep(appPkg,  '@carbon/react') },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // Treat frame-ui-components as source (file: linked, not pre-built)
  optimizeDeps: {
    exclude: ['@ojfbot/frame-ui-components'],
    // CJS transitive deps of the excluded package must be explicitly included
    // so Vite pre-bundles them into ESM — otherwise browsers get CJS/ESM mismatch.
    include: [
      '@ojfbot/frame-ui-components > react-markdown',
      '@ojfbot/frame-ui-components > hast-util-to-jsx-runtime',
      '@ojfbot/frame-ui-components > style-to-js',
      '@ojfbot/frame-ui-components > style-to-object',
    ],
  },
  server: {
    port: 3000,
    // Scoped to the shell host origin. Set SHELL_ORIGIN for staging/preview environments.
    // Not VITE_-prefixed — this is a server-side build var, never injected into the bundle.
    // See .env.example for usage.
    cors: {
      origin: process.env.SHELL_ORIGIN
        ? [process.env.SHELL_ORIGIN, 'http://localhost:4000', 'http://127.0.0.1:4000']
        : ['http://localhost:4000', 'http://127.0.0.1:4000'],
    },
    fs: {
      allow: ['../../..'],
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: true,  // Allow all hosts (workaround for Vite bug in 6.0.9+)
    cors: {
      origin: process.env.SHELL_ORIGIN
        ? [process.env.SHELL_ORIGIN, 'http://localhost:4000', 'http://127.0.0.1:4000']
        : ['http://localhost:4000', 'http://127.0.0.1:4000'],
    },
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
