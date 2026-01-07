import { parseString } from 'xml2js';
import { IDesignItem, DesignIssue } from '../models/Design';
import fs from 'fs';

export interface ParsedSVGResult {
  svgWidth: number;
  svgHeight: number;
  items: IDesignItem[];
  itemsCount: number;
  coverageRatio: number;
  issues: DesignIssue[];
}

export async function parseSvg(filePath: string): Promise<ParsedSVGResult> {
  console.log('[parseSvg] Starting SVG parsing for:', filePath);
  const startTime = Date.now();

  try {
    console.log('[parseSvg] Reading file...');
    const svgContent = fs.readFileSync(filePath, 'utf-8');
    console.log('[parseSvg] File read, size:', svgContent.length, 'bytes');

    return new Promise((resolve, reject) => {
      console.log('[parseSvg] Parsing XML...');
      parseString(svgContent, {
        explicitArray: false, // Don't force arrays for single elements
        mergeAttrs: false,
        explicitRoot: true,
        trim: true
      }, (err: any, result: any) => {
        if (err) {
          console.error('[parseSvg] XML parsing error:', err);
          reject(err);
          return;
        }

        console.log('[parseSvg] XML parsed successfully');

        let svgWidth = 0;
        let svgHeight = 0;
        const items: IDesignItem[] = [];
        const issues: DesignIssue[] = [];

        // Extract SVG dimensions
        console.log('[parseSvg] Extracting SVG dimensions...');
        const svgElement = result.svg || result;
        if (svgElement?.$) {
          // Try to get width and height from attributes
          const widthAttr = svgElement.$.width;
          const heightAttr = svgElement.$.height;

          if (widthAttr) {
            svgWidth = parseFloat(widthAttr.toString().replace(/[^\d.]/g, ''));
          }
          if (heightAttr) {
            svgHeight = parseFloat(heightAttr.toString().replace(/[^\d.]/g, ''));
          }

          // If width/height not found, try to extract from viewBox
          if (svgElement.$['viewBox']) {
            const viewBoxStr = svgElement.$['viewBox'].toString();
            const viewBox = viewBoxStr.split(/[\s,]+/).map(parseFloat).filter((n: number) => !isNaN(n));
            if (viewBox.length === 4) {
              // viewBox format: "x y width height"
              if (svgWidth === 0 || isNaN(svgWidth)) svgWidth = viewBox[2];
              if (svgHeight === 0 || isNaN(svgHeight)) svgHeight = viewBox[3];
            }
          }
        }

        // Fallback: if dimensions are still 0, use defaults
        if ((svgWidth === 0 || isNaN(svgWidth)) && (svgHeight === 0 || isNaN(svgHeight))) {
          svgWidth = 100;
          svgHeight = 100;
        }

        console.log('[parseSvg] SVG dimensions:', svgWidth, 'x', svgHeight);

        // Track visited elements to prevent infinite loops
        const visited = new WeakSet();
        const MAX_RECURSION_DEPTH = 100;

        function extractRects(element: any, depth: number = 0): void {
          if (!element || depth > MAX_RECURSION_DEPTH) {
            if (depth > MAX_RECURSION_DEPTH) {
              console.warn('[parseSvg] Max recursion depth reached, stopping');
            }
            return;
          }

          // Prevent processing the same element twice
          if (visited.has(element)) {
            return;
          }
          visited.add(element);

          // Extract rect elements (as per requirements)
          if (element.rect) {
            const rects = Array.isArray(element.rect) ? element.rect : [element.rect];
            rects.forEach((rect: any) => {
              const x = parseFloat(rect.$.x || '0');
              const y = parseFloat(rect.$.y || '0');
              const width = parseFloat(rect.$.width || '0');
              const height = parseFloat(rect.$.height || '0');
              const fill = rect.$.fill || '#000000';

              // OUT_OF_BOUNDS detection - O(1) per rectangle
              const isOutOfBounds = 
                x < 0 ||
                y < 0 ||
                x + width > svgWidth ||
                y + height > svgHeight;

              const item: IDesignItem = {
                x,
                y,
                width,
                height,
                fill,
              };

              if (isOutOfBounds) {
                item.issue = 'OUT_OF_BOUNDS';
              }

              items.push(item);
            });
          }

          // Also extract path elements that represent rectangles
          // This helps with SVGs that use <path> instead of <rect>
          if (element.path) {
            const paths = Array.isArray(element.path) ? element.path : [element.path];
            console.log(`[parseSvg] Found ${paths.length} path element(s) at depth ${depth}`);
            paths.forEach((path: any, pathIndex: number) => {
              // Handle both path.$ and path.$.d formats
              const pathData = (path.$ && path.$.d) ? path.$.d : (path.d || '');
              const fill = (path.$ && path.$.fill) ? path.$.fill : ((path.$ && path.$.stroke) ? path.$.stroke : (path.fill || path.stroke || 'transparent'));
              console.log(`[parseSvg] Processing path ${pathIndex + 1}, pathData: ${pathData.substring(0, 100)}`);
              
              // Extract bounding box from path data
              // Parse path commands to extract all coordinates
              const coords: number[] = [];
              let currentX = 0;
              let currentY = 0;
              
              // Split path into commands
              const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
              
              commands.forEach((cmd: string) => {
                const type = cmd[0];
                const numbers = cmd.slice(1).match(/[\d.-]+/g)?.map(parseFloat).filter(n => !isNaN(n)) || [];
                
                if (type === 'M' || type === 'm') {
                  // Move to
                  if (numbers.length >= 2) {
                    currentX = type === 'M' ? numbers[0] : currentX + numbers[0];
                    currentY = type === 'M' ? numbers[1] : currentY + numbers[1];
                    coords.push(currentX, currentY);
                  }
                } else if (type === 'L' || type === 'l') {
                  // Line to
                  if (numbers.length >= 2) {
                    currentX = type === 'L' ? numbers[0] : currentX + numbers[0];
                    currentY = type === 'L' ? numbers[1] : currentY + numbers[1];
                    coords.push(currentX, currentY);
                  }
                } else if (type === 'H' || type === 'h') {
                  // Horizontal line
                  if (numbers.length >= 1) {
                    currentX = type === 'H' ? numbers[0] : currentX + numbers[0];
                    coords.push(currentX, currentY);
                  }
                } else if (type === 'V' || type === 'v') {
                  // Vertical line
                  if (numbers.length >= 1) {
                    currentY = type === 'V' ? numbers[0] : currentY + numbers[0];
                    coords.push(currentX, currentY);
                  }
                } else if (type === 'C' || type === 'c') {
                  // Cubic Bezier curve - use end point
                  if (numbers.length >= 6) {
                    currentX = type === 'C' ? numbers[4] : currentX + numbers[4];
                    currentY = type === 'C' ? numbers[5] : currentY + numbers[5];
                    coords.push(currentX, currentY);
                  }
                } else if (type === 'Z' || type === 'z') {
                  // Close path - return to start (already have start point)
                }
              });
              
              // Extract all X and Y coordinates
              const xCoords: number[] = [];
              const yCoords: number[] = [];
              for (let i = 0; i < coords.length; i += 2) {
                if (coords[i] !== undefined) xCoords.push(coords[i]);
                if (coords[i + 1] !== undefined) yCoords.push(coords[i + 1]);
              }
              
              if (xCoords.length > 0 && yCoords.length > 0) {
                const minX = Math.min(...xCoords);
                const maxX = Math.max(...xCoords);
                const minY = Math.min(...yCoords);
                const maxY = Math.max(...yCoords);
                
                const x = minX;
                const y = minY;
                const width = maxX - minX;
                const height = maxY - minY;
                
                // Only add if dimensions are valid
                if (width > 0 && height > 0) {
                  console.log(`[parseSvg] Path converted to rect: x=${x}, y=${y}, width=${width}, height=${height}`);
                  
                  const isOutOfBounds = 
                    x < 0 ||
                    y < 0 ||
                    x + width > svgWidth ||
                    y + height > svgHeight;

                  const item: IDesignItem = {
                    x,
                    y,
                    width,
                    height,
                    fill,
                  };

                  if (isOutOfBounds) {
                    item.issue = 'OUT_OF_BOUNDS';
                  }

                  items.push(item);
                }
              }
            });
          }

          // Recursively process children (groups, svg, etc.)
          if (element.g) {
            const groups = Array.isArray(element.g) ? element.g : [element.g];
            groups.forEach((group: any) => {
              extractRects(group, depth + 1);
            });
          }

          // Only process nested SVG if it's not the root
          if (element.svg && depth > 0) {
            const svgs = Array.isArray(element.svg) ? element.svg : [element.svg];
            svgs.forEach((svg: any) => {
              extractRects(svg, depth + 1);
            });
          }
        }

        try {
          console.log('[parseSvg] Extracting rectangles...');
          // Start extraction from the SVG element, not the root result
          const svgRoot = result.svg || result;
          console.log('[parseSvg] SVG root keys:', Object.keys(svgRoot));
          if (svgRoot.path) {
            console.log('[parseSvg] Path elements found in SVG root:', Array.isArray(svgRoot.path) ? svgRoot.path.length : 1);
          }
          if (svgRoot.rect) {
            console.log('[parseSvg] Rect elements found in SVG root:', Array.isArray(svgRoot.rect) ? svgRoot.rect.length : 1);
          }
          extractRects(svgRoot, 0);
          console.log('[parseSvg] Rectangles found:', items.length);

          // Detect EMPTY issue - O(1) - check if no rectangles
          if (items.length === 0) {
            issues.push('EMPTY');
          }

          // Detect OUT_OF_BOUNDS issue - O(n) single pass (only for rectangles)
          const hasOutOfBounds = items.some(item => item.issue === 'OUT_OF_BOUNDS');
          if (hasOutOfBounds) {
            issues.push('OUT_OF_BOUNDS');
          }

          // Calculate coverage ratio - O(n) single reduce (only for rectangles)
          console.log('[parseSvg] Calculating coverage ratio...');
          const totalRectArea = items.reduce((sum, item) => {
            return sum + (item.width * item.height);
          }, 0);

          const svgArea = svgWidth * svgHeight;
          const coverageRatio = svgArea > 0 ? totalRectArea / svgArea : 0;

          // itemsCount is the number of rectangles (as per requirements)
          const itemsCount = items.length;

          const elapsed = Date.now() - startTime;
          console.log('[parseSvg] Parsing completed in', elapsed, 'ms');
          console.log('[parseSvg] Total elements:', itemsCount, 'Rectangles:', items.length, 'Coverage:', (coverageRatio * 100).toFixed(2) + '%');

          resolve({
            svgWidth,
            svgHeight,
            items,
            itemsCount,
            coverageRatio,
            issues,
          });
        } catch (error) {
          console.error('[parseSvg] Error during extraction:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('[parseSvg] File read error:', error);
    throw error;
  }
}
