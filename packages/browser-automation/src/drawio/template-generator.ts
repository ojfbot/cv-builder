/**
 * Draw.io Template Generator
 *
 * Generates canonical templates from detected patterns for use as
 * few-shot prompting examples and standardized UI flow documentation.
 */

import fs from 'fs';
import path from 'path';
import {
  DrawioUISchema,
  DrawioTemplate,
  TemplateMetadata,
  DrawioNode,
  DrawioEdge,
  SCHEMA_VERSION,
} from './schema.js';

/**
 * Template Generator
 */
export class TemplateGenerator {
  /**
   * Generate templates from a parsed schema
   */
  async generateTemplates(schema: DrawioUISchema): Promise<DrawioTemplate[]> {
    const templates: DrawioTemplate[] = [];

    // Template 1: Navigation Flow
    const navigationTemplate = this.generateNavigationTemplate(schema);
    if (navigationTemplate) {
      templates.push(navigationTemplate);
    }

    // Template 2: Form Interaction
    const formTemplate = this.generateFormTemplate(schema);
    if (formTemplate) {
      templates.push(formTemplate);
    }

    // Template 3: Modal Dialog Flow
    const modalTemplate = this.generateModalTemplate(schema);
    if (modalTemplate) {
      templates.push(modalTemplate);
    }

    return templates;
  }

  /**
   * Generate navigation flow template
   */
  private generateNavigationTemplate(schema: DrawioUISchema): DrawioTemplate | null {
    const navigationNodes = schema.nodes.filter(
      (n) => n.interaction?.type === 'navigation' || n.label.toLowerCase().includes('tab')
    );

    if (navigationNodes.length === 0) {
      return null;
    }

    const metadata: TemplateMetadata = {
      name: 'Navigation Flow',
      description: 'Template for documenting tab switching, page transitions, and navigation patterns',
      category: 'navigation',
      expectedScreenshots: 4,
      tags: ['navigation', 'tabs', 'routing', 'page-transition'],
      examples: [
        'User switches between tabs in a dashboard',
        'User navigates from home to settings page',
        'User uses breadcrumbs to navigate back',
      ],
    };

    // Create simplified schema with example nodes
    const templateSchema: DrawioUISchema = {
      version: SCHEMA_VERSION,
      nodes: [
        {
          id: 'nav-1',
          type: 'page',
          label: 'Dashboard Page',
          metadata: {},
        },
        {
          id: 'nav-2',
          type: 'component',
          label: 'Tab Panel',
          metadata: {},
          screenshotConfig: {
            viewport: 'desktop',
            captureAt: 'before',
          },
        },
        {
          id: 'nav-3',
          type: 'action',
          label: 'user clicks Bio tab button',
          metadata: {},
          interaction: {
            type: 'click',
            target: 'bio-tab-button',
            description: 'Click on Bio tab to navigate',
          },
          confidence: 0.9,
        },
        {
          id: 'nav-4',
          type: 'component',
          label: 'Bio Tab Content',
          metadata: {},
          screenshotConfig: {
            viewport: 'desktop',
            captureAt: 'after',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'nav-1', target: 'nav-2', label: 'contains' },
        { id: 'e2', source: 'nav-2', target: 'nav-3', label: 'user action' },
        { id: 'e3', source: 'nav-3', target: 'nav-4', label: 'results in' },
      ],
      metadata: {
        version: SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        sourceFile: 'navigation-flow.drawio',
      },
    };

    const fewShotExamples = [
      {
        input: 'User clicks on "Settings" tab',
        output: JSON.stringify({
          type: 'action',
          interaction: {
            type: 'click',
            target: 'settings-tab',
          },
          screenshotConfig: {
            viewport: 'desktop',
            captureAt: 'both',
          },
        }, null, 2),
        explanation: 'Tab navigation requires before/after screenshots to capture the transition',
      },
      {
        input: 'User navigates to profile page',
        output: JSON.stringify({
          type: 'action',
          interaction: {
            type: 'navigation',
            target: '/profile',
          },
          screenshotConfig: {
            viewport: 'desktop',
            captureAt: 'after',
          },
        }, null, 2),
        explanation: 'Page navigation captures the destination page state',
      },
    ];

    return {
      metadata,
      schema: templateSchema,
      xml: this.generateDrawioXML(templateSchema),
      fewShotExamples,
    };
  }

  /**
   * Generate form interaction template
   */
  private generateFormTemplate(schema: DrawioUISchema): DrawioTemplate | null {
    const metadata: TemplateMetadata = {
      name: 'Form Interaction',
      description: 'Template for documenting form filling, validation, and submission flows',
      category: 'form',
      expectedScreenshots: 6,
      tags: ['form', 'input', 'validation', 'submit'],
      examples: [
        'User fills out registration form',
        'User submits contact form with validation errors',
        'User uploads file and sees preview',
      ],
    };

    const templateSchema: DrawioUISchema = {
      version: SCHEMA_VERSION,
      nodes: [
        {
          id: 'form-1',
          type: 'component',
          label: 'Contact Form',
          metadata: {},
          screenshotConfig: {
            viewport: 'desktop',
            captureAt: 'before',
          },
        },
        {
          id: 'form-2',
          type: 'action',
          label: 'user types name into name field',
          metadata: {},
          interaction: {
            type: 'type',
            target: 'name-input',
            value: 'John Doe',
            description: 'Fill name field',
          },
          confidence: 0.9,
        },
        {
          id: 'form-3',
          type: 'action',
          label: 'user types email into email field',
          metadata: {},
          interaction: {
            type: 'type',
            target: 'email-input',
            value: 'john@example.com',
            description: 'Fill email field',
          },
          confidence: 0.9,
        },
        {
          id: 'form-4',
          type: 'component',
          label: 'Filled Form',
          metadata: {},
          screenshotConfig: {
            viewport: 'desktop',
            captureAt: 'after',
          },
        },
        {
          id: 'form-5',
          type: 'action',
          label: 'user clicks Submit button',
          metadata: {},
          interaction: {
            type: 'click',
            target: 'submit-button',
            description: 'Submit form',
          },
          confidence: 0.9,
        },
        {
          id: 'form-6',
          type: 'state',
          label: 'Form validation error shown',
          metadata: {},
          assertions: [
            {
              selector: '.error-message',
              expected: { visible: true },
              description: 'Validation error is displayed',
            },
          ],
        },
      ],
      edges: [
        { id: 'e1', source: 'form-1', target: 'form-2' },
        { id: 'e2', source: 'form-2', target: 'form-3' },
        { id: 'e3', source: 'form-3', target: 'form-4' },
        { id: 'e4', source: 'form-4', target: 'form-5' },
        { id: 'e5', source: 'form-5', target: 'form-6' },
      ],
      metadata: {
        version: SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        sourceFile: 'form-interaction.drawio',
      },
    };

    const fewShotExamples = [
      {
        input: 'User enters "test@example.com" in email field',
        output: JSON.stringify({
          type: 'action',
          interaction: {
            type: 'type',
            target: 'email-field',
            value: 'test@example.com',
          },
        }, null, 2),
        explanation: 'Type interactions capture both target field and input value',
      },
      {
        input: 'Form shows validation error',
        output: JSON.stringify({
          type: 'state',
          assertions: [{
            selector: '.error-message',
            expected: { visible: true, text: 'Email is required' },
          }],
        }, null, 2),
        explanation: 'State changes include assertions to verify expected UI state',
      },
    ];

    return {
      metadata,
      schema: templateSchema,
      xml: this.generateDrawioXML(templateSchema),
      fewShotExamples,
    };
  }

  /**
   * Generate modal dialog template
   */
  private generateModalTemplate(schema: DrawioUISchema): DrawioTemplate | null {
    const metadata: TemplateMetadata = {
      name: 'Modal Dialog Flow',
      description: 'Template for documenting modal opening, interaction, and closing',
      category: 'modal',
      expectedScreenshots: 4,
      tags: ['modal', 'dialog', 'overlay', 'popup'],
      examples: [
        'User opens settings modal and changes preferences',
        'User sees confirmation dialog and clicks OK',
        'User closes modal by clicking outside',
      ],
    };

    const templateSchema: DrawioUISchema = {
      version: SCHEMA_VERSION,
      nodes: [
        {
          id: 'modal-1',
          type: 'component',
          label: 'Main Page',
          metadata: {},
          screenshotConfig: {
            viewport: 'desktop',
            captureAt: 'before',
          },
        },
        {
          id: 'modal-2',
          type: 'action',
          label: 'user clicks Settings button',
          metadata: {},
          interaction: {
            type: 'click',
            target: 'settings-button',
            description: 'Open settings modal',
          },
          confidence: 0.9,
        },
        {
          id: 'modal-3',
          type: 'state',
          label: 'Settings modal shown',
          metadata: {},
          assertions: [
            {
              selector: '.settings-modal',
              expected: { visible: true },
              description: 'Modal is visible',
            },
          ],
          screenshotConfig: {
            viewport: 'desktop',
            captureAt: 'after',
          },
        },
        {
          id: 'modal-4',
          type: 'action',
          label: 'user clicks close button',
          metadata: {},
          interaction: {
            type: 'click',
            target: 'modal-close-button',
            description: 'Close modal',
          },
          confidence: 0.9,
        },
        {
          id: 'modal-5',
          type: 'state',
          label: 'Settings modal hidden',
          metadata: {},
          assertions: [
            {
              selector: '.settings-modal',
              expected: { visible: false },
              description: 'Modal is hidden',
            },
          ],
          screenshotConfig: {
            viewport: 'desktop',
            captureAt: 'after',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'modal-1', target: 'modal-2' },
        { id: 'e2', source: 'modal-2', target: 'modal-3' },
        { id: 'e3', source: 'modal-3', target: 'modal-4' },
        { id: 'e4', source: 'modal-4', target: 'modal-5' },
      ],
      metadata: {
        version: SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        sourceFile: 'modal-dialog.drawio',
      },
    };

    const fewShotExamples = [
      {
        input: 'User clicks "Delete" button',
        output: JSON.stringify({
          type: 'action',
          interaction: {
            type: 'click',
            target: 'delete-button',
          },
          expectedModal: {
            selector: '.confirmation-dialog',
            visible: true,
          },
        }, null, 2),
        explanation: 'Modal-triggering actions should document expected modal appearance',
      },
    ];

    return {
      metadata,
      schema: templateSchema,
      xml: this.generateDrawioXML(templateSchema),
      fewShotExamples,
    };
  }

  /**
   * Generate Draw.io XML from schema
   */
  private generateDrawioXML(schema: DrawioUISchema): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<mxfile host="CV Builder" modified="' + new Date().toISOString() + '" version="1.0.0">\n';
    xml += '  <diagram name="Page-1" id="template">\n';
    xml += '    <mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1">\n';
    xml += '      <root>\n';
    xml += '        <mxCell id="0" />\n';
    xml += '        <mxCell id="1" parent="0" />\n';

    // Add nodes
    let y = 100;
    schema.nodes.forEach((node, idx) => {
      const x = 100 + (idx % 2) * 300;
      if (idx % 2 === 0 && idx > 0) y += 120;

      const style = this.getNodeStyle(node);
      xml += `        <mxCell id="${node.id}" value="${this.escapeXML(node.label)}" style="${style}" vertex="1" parent="1">\n`;
      xml += `          <mxGeometry x="${x}" y="${y}" width="200" height="80" as="geometry" />\n`;
      xml += '        </mxCell>\n';
    });

    // Add edges
    schema.edges.forEach((edge) => {
      xml += `        <mxCell id="${edge.id}" value="${this.escapeXML(edge.label || '')}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;" edge="1" parent="1" source="${edge.source}" target="${edge.target}">\n`;
      xml += '          <mxGeometry relative="1" as="geometry" />\n';
      xml += '        </mxCell>\n';
    });

    xml += '      </root>\n';
    xml += '    </mxGraphModel>\n';
    xml += '  </diagram>\n';
    xml += '</mxfile>\n';

    return xml;
  }

  /**
   * Get Draw.io style for node type
   */
  private getNodeStyle(node: DrawioNode): string {
    const baseStyle = 'rounded=1;whiteSpace=wrap;html=1;';

    switch (node.type) {
      case 'page':
        return baseStyle + 'fillColor=#dae8fc;strokeColor=#6c8ebf;';
      case 'component':
        return baseStyle + 'fillColor=#d5e8d4;strokeColor=#82b366;';
      case 'action':
        return baseStyle + 'fillColor=#fff2cc;strokeColor=#d6b656;';
      case 'state':
        return baseStyle + 'fillColor=#f8cecc;strokeColor=#b85450;';
      case 'screenshot':
        return baseStyle + 'fillColor=#e1d5e7;strokeColor=#9673a6;';
      default:
        return baseStyle + 'fillColor=#f5f5f5;strokeColor=#666666;';
    }
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Export templates to files
   */
  async exportTemplates(templates: DrawioTemplate[], outputDir: string): Promise<void> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const template of templates) {
      const filename = template.metadata.name.toLowerCase().replace(/\s+/g, '-');

      // Save Draw.io XML
      const xmlPath = path.join(outputDir, `${filename}.drawio`);
      fs.writeFileSync(xmlPath, template.xml);

      // Save schema JSON
      const schemaPath = path.join(outputDir, `${filename}-schema.json`);
      fs.writeFileSync(schemaPath, JSON.stringify(template.schema, null, 2));

      // Save metadata
      const metadataPath = path.join(outputDir, `${filename}-metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify({
        metadata: template.metadata,
        fewShotExamples: template.fewShotExamples,
      }, null, 2));

      console.log(`✅ Exported template: ${filename}`);
    }
  }

  /**
   * Create custom shape library
   */
  createShapeLibrary(): string {
    const shapes = [
      {
        name: 'ScreenshotPoint',
        style: 'shape=ellipse;fillColor=#e1d5e7;strokeColor=#9673a6;',
        description: 'Marks where screenshots should be captured',
      },
      {
        name: 'UserAction',
        style: 'shape=process;fillColor=#fff2cc;strokeColor=#d6b656;',
        description: 'Represents user interactions',
      },
      {
        name: 'StateAssertion',
        style: 'shape=hexagon;fillColor=#f8cecc;strokeColor=#b85450;',
        description: 'Expected UI state after action',
      },
      {
        name: 'ViewportMarker',
        style: 'shape=rectangle;fillColor=#dae8fc;strokeColor=#6c8ebf;dashed=1;',
        description: 'Specifies viewport size',
      },
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<mxlibrary>\n';
    xml += JSON.stringify(shapes.map((shape) => ({
      xml: `<mxCell style="${shape.style}" vertex="1"><mxGeometry width="120" height="60" as="geometry"/></mxCell>`,
      w: 120,
      h: 60,
      title: shape.name,
      tags: shape.description,
    })));
    xml += '\n</mxlibrary>';

    return xml;
  }
}

/**
 * Utility function to generate templates
 */
export async function generateTemplates(schema: DrawioUISchema): Promise<DrawioTemplate[]> {
  const generator = new TemplateGenerator();
  return generator.generateTemplates(schema);
}
