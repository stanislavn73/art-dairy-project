import OpenSeadragon from 'openseadragon';

const initializeViewer = (): OpenSeadragon.Viewer => {
  return OpenSeadragon({
    id: 'openseadragon-viewer',
    showNavigationControl: false,
    tileSources: '/dzi.dzi',
    maxZoomPixelRatio: 2,
    visibilityRatio: 1,
    minZoomLevel: 1,
    defaultZoomLevel: 1,
    homeFillsViewer: true, // Ensures the image fits within the viewer
  });
};

// Function to get bounding box of an SVG element in image coordinates
const getImageBBox = (
  element: SVGGraphicsElement,
): { x: number; y: number; width: number; height: number } => {
  const bbox = element.getBBox();
  return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
};

// Attach interactivity to individual SVG zones
const attachZoneInteractivity = (
  allZones: HTMLElement,
  viewer: OpenSeadragon.Viewer,
) => {
  Array.from(allZones.children).forEach((child) => {
    const element = child as SVGGraphicsElement;

    element.setAttribute('fill', 'black');
    element.setAttribute('pointer-events', 'auto');
    element.style.pointerEvents = 'auto';
    element.style.cursor = 'pointer';

    if (!(element as any)._osdClickAttached) {
      // Add click listener only once
      (element as any)._osdClickAttached = true;

      element.addEventListener('click', (event) => {
        event.stopPropagation();

        // Get bounding box in image coordinates
        const bbox = getImageBBox(element);

        // Translate bbox to viewer coordinates
        const viewportRect = viewer.viewport.imageToViewportRectangle(
          bbox.x,
          bbox.y,
          bbox.width,
          bbox.height,
        );

        // Smoothly zoom to the selected SVG zone
        viewer.viewport.fitBounds(viewportRect, true);
      });
    }
  });
};

// Function to update the SVG overlay's position and scale
const updateOverlay = (
  viewer: OpenSeadragon.Viewer,
  svg: SVGSVGElement,
  allZones: HTMLElement,
) => {
  const tiledImage = viewer.world.getItemAt(0);
  const imageWidth = tiledImage.getContentSize().x;
  const imageHeight = tiledImage.getContentSize().y;

  const transformGroup = svg.children.item(0) as SVGGraphicsElement;

  // Calculate the transform coordinates (translate + scale)
  const topLeft = viewer.viewport.imageToViewerElementCoordinates(
    new OpenSeadragon.Point(0, 0),
  );
  const bottomRight = viewer.viewport.imageToViewerElementCoordinates(
    new OpenSeadragon.Point(imageWidth, imageHeight),
  );
  const scaleX = (bottomRight.x - topLeft.x) / imageWidth;
  const scaleY = (bottomRight.y - topLeft.y) / imageHeight;

  // Apply the transformation to the SVG group
  transformGroup.setAttribute(
    'transform',
    `translate(${topLeft.x},${topLeft.y}) scale(${scaleX},${scaleY})`,
  );

  // Attach interactivity to zones
  attachZoneInteractivity(allZones, viewer);
};

const main = () => {
  const viewer = initializeViewer();

  // Cache SVG and zones
  const svg = document.getElementById(
    'custom-svg-overlay',
  ) as unknown as SVGSVGElement;
  const allZones = document.getElementById('all-zones');

  if (!svg || !allZones) {
    console.error('SVG overlay or zones not found.');
    return;
  }

  // Update overlay whenever viewer updates occur
  const runUpdateOverlay = () => updateOverlay(viewer, svg, allZones);

  viewer.addHandler('animation', runUpdateOverlay); // For smooth zooming and panning
  viewer.addHandler('resize', runUpdateOverlay); // For Responsive Resize
  viewer.addHandler('open', runUpdateOverlay); // When viewer initializes

  console.log('OpenSeadragon viewer initialized.');
};

document.addEventListener('DOMContentLoaded', main);
