/**
 * Export Draw.io templates script
 *
 * Usage: tsx src/drawio/export-templates.ts
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { TemplateGenerator } from './template-generator.js';
import { SCHEMA_VERSION } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('📝 Generating Draw.io Templates\n');

  const generator = new TemplateGenerator();

  // Create empty schema (templates are self-contained)
  const emptySchema = {
    version: SCHEMA_VERSION,
    nodes: [],
    edges: [],
    metadata: {
      version: SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
    },
  };

  // Generate templates
  const templates = await generator.generateTemplates(emptySchema);

  console.log(`✅ Generated ${templates.length} templates:\n`);
  templates.forEach((template, idx) => {
    console.log(`  ${idx + 1}. ${template.metadata.name}`);
    console.log(`     Category: ${template.metadata.category}`);
    console.log(`     Expected screenshots: ${template.metadata.expectedScreenshots}`);
    console.log(`     Tags: ${template.metadata.tags.join(', ')}`);
    console.log('');
  });

  // Export to templates directory
  const outputDir = path.join(__dirname, '../../templates/drawio');
  await generator.exportTemplates(templates, outputDir);

  console.log(`\n💾 Templates exported to: ${outputDir}`);

  // Generate custom shape library
  const shapeLibrary = generator.createShapeLibrary();
  const shapeLibraryPath = path.join(outputDir, 'custom-shapes.xml');
  const fs = await import('fs');
  fs.writeFileSync(shapeLibraryPath, shapeLibrary);

  console.log(`💾 Custom shape library: ${shapeLibraryPath}`);

  console.log('\n✅ Template generation complete!\n');
}

main().catch((error) => {
  console.error('\n❌ Template generation failed:', error);
  process.exit(1);
});
