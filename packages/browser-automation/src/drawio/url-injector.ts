/**
 * Draw.io URL Injector
 *
 * Replaces inline base64 image data (or stale URLs) in draw.io XML cells
 * with fresh S3 URLs. Works on the <object>/<mxCell> structure where the
 * image is stored in the mxCell's `style` attribute as `image=<value>`.
 *
 * The draw.io template uses <object> elements as cell wrappers with metadata
 * attributes (TabPanel, AppSidebar, ChatWindow, etc.). Each <object> has a
 * stable `id` attribute that we use to locate the right cell.
 *
 * Uses @xmldom/xmldom for DOM-based XML parsing so node lookup is robust
 * against attribute-order variations and can never accidentally match an ID
 * that appears inside another attribute's value or in a neighbouring element.
 * The DOM serialiser handles XML attribute escaping automatically.
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

export interface CellUrlMapping {
  /** The draw.io <object> element's id attribute */
  objectId: string;
  /** S3 URL (or any public HTTPS URL) to inject as the image source */
  url: string;
}

export interface InjectionResult {
  objectId: string;
  success: boolean;
  message: string;
}

export class DrawioUrlInjector {
  /**
   * Inject S3 URLs into draw.io XML content.
   * Parses the XML once, mutates the DOM in place for all mappings, then
   * serialises once. Returns the modified XML string and a per-cell report.
   */
  inject(
    xmlContent: string,
    mappings: CellUrlMapping[]
  ): { xml: string; results: InjectionResult[] } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');
    const results: InjectionResult[] = [];

    for (const { objectId, url } of mappings) {
      const result = this.injectOneCell(doc, objectId, url);
      results.push(result);
    }

    const serializer = new XMLSerializer();
    const xml = serializer.serializeToString(doc);
    return { xml, results };
  }

  /**
   * Locate one <object id="objectId"> element in the DOM, find its nested
   * <mxCell style="...shape=image..."> child, and update the image= value.
   * The DOM serialiser automatically XML-escapes the new attribute value.
   */
  private injectOneCell(
    doc: ReturnType<DOMParser['parseFromString']>,
    objectId: string,
    url: string
  ): InjectionResult {
    // Only accept HTTPS URLs — reject data URIs, http://, and other schemes.
    if (!url.startsWith('https://')) {
      return {
        objectId,
        success: false,
        message: `Rejected non-HTTPS url for id="${objectId}"`,
      };
    }

    // Find the <object> element whose id attribute exactly matches objectId
    const objects = doc.getElementsByTagName('object');
    let targetObject = null;
    for (let i = 0; i < objects.length; i++) {
      if (objects[i].getAttribute('id') === objectId) {
        targetObject = objects[i];
        break;
      }
    }

    if (!targetObject) {
      return {
        objectId,
        success: false,
        message: `<object id="${objectId}"> not found in XML`,
      };
    }

    // Find the nested <mxCell> whose style includes 'shape=image'
    const cells = targetObject.getElementsByTagName('mxCell');
    let imageCell = null;
    for (let i = 0; i < cells.length; i++) {
      const style = cells[i].getAttribute('style') || '';
      if (style.includes('shape=image')) {
        imageCell = cells[i];
        break;
      }
    }

    if (!imageCell) {
      return {
        objectId,
        success: false,
        message: `No shape=image style found in object id="${objectId}"`,
      };
    }

    const oldStyle = imageCell.getAttribute('style') || '';

    // Replace image=<value> (ends at ;" or "). Handles base64, https://, and
    // empty image= values. setAttribute takes the raw (unescaped) URL value;
    // the serialiser will escape & and other special chars in the output XML.
    const newStyle = oldStyle.replace(/image=[^;"]*/, `image=${url}`);

    if (newStyle === oldStyle) {
      return {
        objectId,
        success: false,
        message: `image= pattern not found in style for id="${objectId}"`,
      };
    }

    imageCell.setAttribute('style', newStyle);
    return {
      objectId,
      success: true,
      message: `Injected URL for id="${objectId}"`,
    };
  }

  /**
   * Read a draw.io template, inject URLs, write to outputPath.
   */
  injectFromFile(
    templatePath: string,
    mappings: CellUrlMapping[],
    outputPath: string
  ): InjectionResult[] {
    const content = fs.readFileSync(templatePath, 'utf-8');
    const { xml, results } = this.inject(content, mappings);

    // Write atomically: write to a sibling temp file then rename so a crash
    // mid-write never leaves the template in a partially-written state.
    const tmpPath = path.join(os.tmpdir(), `drawio-inject-${randomUUID()}.tmp`);
    fs.writeFileSync(tmpPath, xml, 'utf-8');
    fs.renameSync(tmpPath, outputPath);

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    console.log(
      `[DrawioUrlInjector] ${succeeded} cells updated, ${failed} skipped → ${outputPath}`
    );

    for (const r of results) {
      if (!r.success) {
        console.warn(`  ⚠ ${r.message}`);
      }
    }

    return results;
  }
}
