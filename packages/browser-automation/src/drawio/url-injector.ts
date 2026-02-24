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
 */

import fs from 'fs';

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
   * Returns the modified XML string and a report of what was updated.
   */
  inject(
    xmlContent: string,
    mappings: CellUrlMapping[]
  ): { xml: string; results: InjectionResult[] } {
    let xml = xmlContent;
    const results: InjectionResult[] = [];

    for (const { objectId, url } of mappings) {
      const { xml: updated, result } = this.injectOneCell(xml, objectId, url);
      xml = updated;
      results.push(result);
    }

    return { xml, results };
  }

  /**
   * Inject a single cell's URL.
   * Locates the <object id="objectId"> element, finds its nested
   * <mxCell style="...shape=image...image=<old>..."> and replaces
   * the image= value with the new URL.
   */
  private injectOneCell(
    xml: string,
    objectId: string,
    url: string
  ): { xml: string; result: InjectionResult } {
    const objectIdToken = `id="${objectId}"`;
    const objectStart = xml.indexOf(objectIdToken);

    if (objectStart === -1) {
      return {
        xml,
        result: {
          objectId,
          success: false,
          message: `<object id="${objectId}"> not found in XML`,
        },
      };
    }

    // Find the enclosing </object> after this id attribute
    const objectClose = xml.indexOf('</object>', objectStart);
    if (objectClose === -1) {
      return {
        xml,
        result: {
          objectId,
          success: false,
          message: `Could not find closing </object> for id="${objectId}"`,
        },
      };
    }

    const closeTagLen = '</object>'.length;
    const before = xml.substring(0, objectStart);
    const objectSection = xml.substring(objectStart, objectClose + closeTagLen);
    const after = xml.substring(objectClose + closeTagLen);

    // Find the mxCell style attribute containing shape=image
    // The style looks like: style="shape=image;aspect=fixed;image=data:image/png,<base64>"
    // or after a previous injection: style="shape=image;aspect=fixed;image=https://..."
    const styleRegex = /style="([^"]*shape=image[^"]*)"/;
    const styleMatch = objectSection.match(styleRegex);

    if (!styleMatch) {
      return {
        xml,
        result: {
          objectId,
          success: false,
          message: `No shape=image style found in object id="${objectId}"`,
        },
      };
    }

    const oldStyle = styleMatch[1];

    // Replace the image= value. It ends at ;" or just " (end of style attribute).
    // Handles: image=data:image/png,<base64>  image=https://...  image=
    const newStyle = oldStyle.replace(/image=[^;"]*/, `image=${url}`);

    if (newStyle === oldStyle) {
      return {
        xml,
        result: {
          objectId,
          success: false,
          message: `image= pattern not found in style for id="${objectId}"`,
        },
      };
    }

    const newObjectSection = objectSection.replace(
      styleMatch[0],
      `style="${newStyle}"`
    );

    return {
      xml: before + newObjectSection + after,
      result: {
        objectId,
        success: true,
        message: `Injected URL for id="${objectId}"`,
      },
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
    fs.writeFileSync(outputPath, xml, 'utf-8');

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
