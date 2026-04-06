#!/usr/bin/env tsx
/**
 * Post-build artifact scanner
 *
 * Scans dist/ directories across all workspace packages for production safety violations:
 * - .map files (source maps exposing internal code structure)
 * - sourceMappingURL directives embedded in JS/CSS
 * - API key patterns (sk-ant-*, ANTHROPIC_API_KEY, etc.)
 * - debugger statements
 *
 * Defense in depth: ESLint catches the configuration (sourceMap: true in tsconfig).
 * This scanner catches the artifact (.map files actually shipped in dist/).
 * Both layers are needed — the Claude Code source map leak (March 2026, v2.1.88)
 * shipped because there was no artifact-level check.
 *
 * Usage:
 *   tsx scripts/artifact-scanner.ts          # scan all packages
 *   tsx scripts/artifact-scanner.ts api      # scan specific package
 *
 * Exit codes:
 *   0 = clean
 *   1 = violations found
 */

import * as fs from 'fs'
import * as path from 'path'

interface Violation {
  file: string
  type: 'source-map-file' | 'source-mapping-url' | 'api-key' | 'debugger'
  detail: string
  line?: number
}

const API_KEY_PATTERNS = [
  /sk-ant-[a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{32,}/,
  /ANTHROPIC_API_KEY/,
  /OPENAI_API_KEY/,
  /dangerouslyAllowBrowser:\s*true/,
]

const DEBUGGER_PATTERNS = [
  /\bdebugger\b/,
]

function walkDir(dir: string): string[] {
  const files: string[] = []
  if (!fs.existsSync(dir)) return files

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip node_modules inside dist (unlikely but defensive)
      if (entry.name === 'node_modules') continue
      files.push(...walkDir(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = []
  const ext = path.extname(filePath).toLowerCase()
  const relativePath = path.relative(process.cwd(), filePath)

  // Check for .map files
  // .d.ts.map files (declaration maps) are safe — they help editors navigate to source
  // .js.map files are the security risk — they expose implementation details
  if (ext === '.map') {
    const isDeclarationMap = filePath.endsWith('.d.ts.map')
    if (!isDeclarationMap) {
      violations.push({
        file: relativePath,
        type: 'source-map-file',
        detail: 'Source map file found in build output. Remove sourceMap/sourcemap from build config.',
      })
    }
    return violations // No need to scan content of .map files
  }

  // Only scan text files
  if (!['.js', '.mjs', '.cjs', '.ts', '.css', '.html', '.json'].includes(ext)) {
    return violations
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Check for sourceMappingURL
    // Skip in .d.ts files — those reference declaration maps which are safe
    if (line.includes('sourceMappingURL') && !filePath.endsWith('.d.ts')) {
      violations.push({
        file: relativePath,
        type: 'source-mapping-url',
        detail: `sourceMappingURL directive found`,
        line: lineNum,
      })
    }

    // Check for API key patterns
    for (const pattern of API_KEY_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: relativePath,
          type: 'api-key',
          detail: `Possible API key or unsafe config: ${pattern.source}`,
          line: lineNum,
        })
        break // One API key violation per line is enough
      }
    }

    // Check for debugger statements (only in JS files)
    if (['.js', '.mjs', '.cjs'].includes(ext)) {
      for (const pattern of DEBUGGER_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            file: relativePath,
            type: 'debugger',
            detail: 'debugger statement found in production build',
            line: lineNum,
          })
        }
      }
    }
  }

  return violations
}

function main() {
  const targetPackage = process.argv[2]
  const packagesDir = path.resolve(process.cwd(), 'packages')

  if (!fs.existsSync(packagesDir)) {
    console.error('No packages/ directory found. Run from the monorepo root.')
    process.exit(1)
  }

  const packages = targetPackage
    ? [targetPackage]
    : fs.readdirSync(packagesDir).filter((name) => {
        const pkgPath = path.join(packagesDir, name)
        return fs.statSync(pkgPath).isDirectory() && name !== 'temp'
      })

  const allViolations: Violation[] = []
  let scannedFiles = 0
  let scannedPackages = 0

  for (const pkg of packages) {
    const distDir = path.join(packagesDir, pkg, 'dist')
    if (!fs.existsSync(distDir)) continue

    scannedPackages++
    const files = walkDir(distDir)

    for (const file of files) {
      scannedFiles++
      allViolations.push(...scanFile(file))
    }
  }

  // Report
  console.log(`\n🔍 Artifact Scanner Results`)
  console.log(`   Packages scanned: ${scannedPackages}`)
  console.log(`   Files scanned: ${scannedFiles}`)

  if (allViolations.length === 0) {
    console.log(`   Status: ✅ CLEAN — no violations found\n`)
    process.exit(0)
  }

  console.log(`   Status: ❌ ${allViolations.length} violation(s) found\n`)

  // Group by type
  const byType = new Map<string, Violation[]>()
  for (const v of allViolations) {
    const existing = byType.get(v.type) || []
    existing.push(v)
    byType.set(v.type, existing)
  }

  for (const [type, violations] of byType) {
    console.log(`  [${type}] (${violations.length})`)
    for (const v of violations) {
      const loc = v.line ? `:${v.line}` : ''
      console.log(`    ${v.file}${loc} — ${v.detail}`)
    }
    console.log()
  }

  process.exit(1)
}

main()
