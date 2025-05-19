/**
 * Scales and appends all <g>, <path>, <rect>, <circle>, <ellipse>, <polygon>, and <polyline> elements
 * from the parsed SVG document to the given SVG group node, transforming their coordinates from the
 * original image size to the processed image size.
 * @param svgElement The root SVG element parsed from the SVG file.
 * @param overlayGroup The <g> node from the OpenSeadragon SVG overlay.
 * @param originalWidth The width of the original image (SVG coordinate system).
 * @param originalHeight The height of the original image (SVG coordinate system).
 * @param processedWidth The width of the processed image (OpenSeadragon image).
 * @param processedHeight The height of the processed image (OpenSeadragon image).
 */
export function appendScaledSvgShapes(
  svgElement: SVGSVGElement,
  overlayGroup: SVGGElement,
  originalWidth: number,
  originalHeight: number,
  processedWidth: number,
  processedHeight: number,
): void {
  const scaleX = processedWidth / originalWidth;
  const scaleY = processedHeight / originalHeight;

  // Helper to scale a single number
  const sx = (x: number) => x * scaleX;
  const sy = (y: number) => y * scaleY;

  // Helper to scale points string (for polygon/polyline)
  function scalePoints(points: string): string {
    return points
      .trim()
      .split(/\s+/)
      .map((pair) => {
        const [x, y] = pair.split(',').map(Number);
        return `${sx(x)},${sy(y)}`;
      })
      .join(' ');
  }

  // Helper to scale path data (basic version, handles M/L/C/Z and numbers)
  function scalePathData(d: string): string {
    // This is a simple parser, not a full SVG path parser!
    // It works for most simple paths (M, L, C, Q, S, T, etc.)
    return d.replace(/([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g, (match, cmd, params) => {
      if (cmd.toUpperCase() === 'Z') return cmd;
      const isRelative = cmd === cmd.toLowerCase();
      // Split params into numbers
      const numbers = params
        .trim()
        .replace(/(\d)-/g, '$1 -') // separate negative numbers
        .split(/[\s,]+/)
        .filter((n) => n.length)
        .map(Number);

      // Determine how to scale based on command
      let scaled: number[] = [];
      switch (cmd.toUpperCase()) {
        case 'H': // horizontal lineto: only x
          scaled = numbers.map(n => sx(n));
          break;
        case 'V': // vertical lineto: only y
          scaled = numbers.map(n => sy(n));
          break;
        default:
          // For all others, alternate x/y
          scaled = numbers.map((n, i) => (i % 2 === 0 ? sx(n) : sy(n)));
      }
      return cmd + (scaled.length ? ' ' + scaled.join(' ') : '');
    });
  }

  // Recursively process and append supported SVG elements
  function processAndAppend(node: Element, parent: SVGGElement) {
    let newNode: Element | null = null;

    switch (node.tagName.toLowerCase()) {
      case 'g':
        newNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        // Copy attributes except transform
        Array.from(node.attributes).forEach((attr) => {
          if (attr.name !== 'transform') newNode!.setAttribute(attr.name, attr.value);
        });
        // Add ID if not present
        if (!newNode.hasAttribute('id')) {
          newNode.setAttribute('id', `_${Math.random().toString(36).substr(2, 9)}`);
        }
        // Recursively process children
        Array.from(node.children).forEach((child) => processAndAppend(child, newNode as SVGGElement));
        break;
      case 'path':
        newNode = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        Array.from(node.attributes).forEach((attr) => {
          if (attr.name === 'd') {
            newNode!.setAttribute('d', scalePathData(attr.value));
          } else {
            newNode!.setAttribute(attr.name, attr.value);
          }
        });
        break;
      case 'rect':
        newNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        Array.from(node.attributes).forEach((attr) => {
          switch (attr.name) {
            case 'x':
              newNode!.setAttribute('x', String(sx(Number(attr.value))));
              break;
            case 'y':
              newNode!.setAttribute('y', String(sy(Number(attr.value))));
              break;
            case 'width':
              newNode!.setAttribute('width', String(sx(Number(attr.value))));
              break;
            case 'height':
              newNode!.setAttribute('height', String(sy(Number(attr.value))));
              break;
            default:
              newNode!.setAttribute(attr.name, attr.value);
          }
        });
        break;
      case 'circle':
        newNode = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        Array.from(node.attributes).forEach((attr) => {
          switch (attr.name) {
            case 'cx':
              newNode!.setAttribute('cx', String(sx(Number(attr.value))));
              break;
            case 'cy':
              newNode!.setAttribute('cy', String(sy(Number(attr.value))));
              break;
            case 'r':
              // Scale radius by average of scaleX and scaleY
              newNode!.setAttribute('r', String((sx(Number(attr.value)) + sy(Number(attr.value))) / 2));
              break;
            default:
              newNode!.setAttribute(attr.name, attr.value);
          }
        });
        break;
      case 'ellipse':
        newNode = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        Array.from(node.attributes).forEach((attr) => {
          switch (attr.name) {
            case 'cx':
              newNode!.setAttribute('cx', String(sx(Number(attr.value))));
              break;
            case 'cy':
              newNode!.setAttribute('cy', String(sy(Number(attr.value))));
              break;
            case 'rx':
              newNode!.setAttribute('rx', String(sx(Number(attr.value))));
              break;
            case 'ry':
              newNode!.setAttribute('ry', String(sy(Number(attr.value))));
              break;
            default:
              newNode!.setAttribute(attr.name, attr.value);
          }
        });
        break;
      case 'polygon':
      case 'polyline':
        newNode = document.createElementNS('http://www.w3.org/2000/svg', node.tagName.toLowerCase());
        Array.from(node.attributes).forEach((attr) => {
          if (attr.name === 'points') {
            newNode!.setAttribute('points', scalePoints(attr.value));
          } else {
            newNode!.setAttribute(attr.name, attr.value);
          }
        });
        break;
      default:
        // Ignore unsupported elements
        break;
    }

    if (newNode) {
      parent.appendChild(newNode);
    }
  }

  // Start processing from the SVG's direct children
  Array.from(svgElement.children).forEach((child) => processAndAppend(child, overlayGroup));
}

/**
 * @deprecated Use appendScaledSvgShapes instead
 */
export function appendScaledSvgGroupsAndPaths(
  svgElement: SVGSVGElement,
  overlayGroup: SVGGElement,
  originalWidth: number,
  originalHeight: number,
  processedWidth: number,
  processedHeight: number,
): void {
  console.warn('appendScaledSvgGroupsAndPaths is deprecated. Use appendScaledSvgShapes instead.');
  appendScaledSvgShapes(
    svgElement,
    overlayGroup,
    originalWidth,
    originalHeight,
    processedWidth,
    processedHeight
  );
}
