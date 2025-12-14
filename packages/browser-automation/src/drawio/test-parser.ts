/**
 * Test script for Draw.io parser and pattern detector
 *
 * Usage: tsx src/drawio/test-parser.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseDrawioXML } from './parser.js';
import { detectPatterns } from './pattern-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🔍 Testing Draw.io Parser and Pattern Detector\n');

  // Read the source file
  const sourceFile = path.join(__dirname, '../../templates/drawio/cvBuilder.drawio.xml');

  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Source file not found: ${sourceFile}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(sourceFile, 'utf-8');
  console.log(`📄 Loaded: ${sourceFile}`);
  console.log(`📦 File size: ${(xml.length / 1024).toFixed(2)} KB\n`);

  // Parse the XML
  console.log('🔧 Parsing Draw.io XML...');
  const parseResult = parseDrawioXML(xml, 'cvBuilder.drawio.xml');

  // Display results
  console.log('\n📊 Parse Results:');
  console.log(`  Total nodes: ${parseResult.stats.totalNodes}`);
  console.log(`  Total edges: ${parseResult.stats.totalEdges}`);
  console.log('\n  Nodes by type:');
  Object.entries(parseResult.stats.nodesByType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`    ${type.padEnd(12)}: ${count}`);
    }
  });

  // Display warnings and errors
  if (parseResult.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${parseResult.warnings.length}):`);
    parseResult.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
  }

  if (parseResult.errors.length > 0) {
    console.log(`\n❌ Errors (${parseResult.errors.length}):`);
    parseResult.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    process.exit(1);
  }

  // Detect patterns
  console.log('\n🎯 Detecting patterns...');
  const patterns = detectPatterns(parseResult.schema);
  parseResult.schema.patterns = patterns;
  parseResult.stats.patternsDetected = patterns.length;

  console.log(`\n📋 Detected ${patterns.length} patterns:\n`);

  const patternsByType = patterns.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(patternsByType).forEach(([type, count]) => {
    console.log(`  ${type.padEnd(20)}: ${count}`);
  });

  // Display top patterns
  console.log('\n🏆 Top 10 patterns (by confidence):\n');
  patterns.slice(0, 10).forEach((pattern, i) => {
    console.log(`  ${i + 1}. [${pattern.type}] (${(pattern.confidence * 100).toFixed(0)}%)`);
    console.log(`     Nodes: ${pattern.nodes.join(', ')}`);
    if (pattern.data.target) {
      console.log(`     Target: ${pattern.data.target}`);
    }
    if (pattern.reasoning) {
      console.log(`     Reasoning: ${pattern.reasoning}`);
    }
    console.log('');
  });

  // Display sample nodes with detected patterns
  console.log('\n📝 Sample enriched nodes:\n');
  const enrichedNodes = parseResult.schema.nodes.filter((n) => n.confidence && n.confidence > 0.5);
  enrichedNodes.slice(0, 5).forEach((node, i) => {
    console.log(`  ${i + 1}. ${node.label}`);
    console.log(`     Type: ${node.type}`);
    console.log(`     Confidence: ${((node.confidence || 0) * 100).toFixed(0)}%`);
    if (node.interaction) {
      console.log(`     Interaction: ${node.interaction.type}`);
      if (node.interaction.target) {
        console.log(`     Target: ${node.interaction.target}`);
      }
    }
    if (node.screenshotConfig) {
      console.log(`     Screenshot: ${node.screenshotConfig.viewport} (${node.screenshotConfig.captureAt})`);
    }
    console.log('');
  });

  // Save results
  const outputDir = path.join(__dirname, '../../temp/drawio-test');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, 'parsed-schema.json');
  fs.writeFileSync(outputFile, JSON.stringify(parseResult.schema, null, 2));
  console.log(`\n💾 Saved parsed schema to: ${outputFile}`);

  const statsFile = path.join(outputDir, 'parse-stats.json');
  fs.writeFileSync(statsFile, JSON.stringify({
    stats: parseResult.stats,
    warnings: parseResult.warnings,
    errors: parseResult.errors,
    topPatterns: patterns.slice(0, 20),
  }, null, 2));
  console.log(`💾 Saved statistics to: ${statsFile}`);

  console.log('\n✅ Test complete!\n');
}

main().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
