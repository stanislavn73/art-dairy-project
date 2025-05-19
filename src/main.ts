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
    homeFillsViewer: true,
  });
};

const detectPointerInside = (element: SVGGeometryElement) => {
  // Function to check if the mouse is inside an element
  return (event: MouseEvent) => {
    const point = element.ownerSVGElement?.createSVGPoint();
    if (!point) return false;

    // Set the mouse coordinates to the SVG point
    point.x = event.clientX;
    point.y = event.clientY;

    // Convert screen coordinates to the SVG's coordinate system
    const transformedPoint = point.matrixTransform(
      element.getScreenCTM()?.inverse(),
    );

    // Check if the mouse is inside the SVG element
    return (
      element.isPointInFill?.(transformedPoint) ||
      element.isPointInStroke?.(transformedPoint)
    );
  };
};

const handleInteractions = (
  viewer: OpenSeadragon.Viewer,
  element: SVGGeometryElement, // The clickable SVG element
) => {
  let isDragging = false;
  let clickStart: number;
  let startMousePosition: OpenSeadragon.Point | null = null;

  element.addEventListener('mousedown', (event: MouseEvent) => {
    isDragging = false; // Reset dragging state
    clickStart = Date.now();
    startMousePosition = new OpenSeadragon.Point(event.clientX, event.clientY);
  });

  document.addEventListener('mousemove', (event: MouseEvent) => {
    const isInside = detectPointerInside(element)(event);

    if (isInside) {
      // Highlight or interact with the element if the pointer is inside
      element.style.opacity = '1';
    } else {
      // Reset opacity if the pointer is outside
      element.style.opacity = '0';
    }

    if (!clickStart) return;

    const currentPos = new OpenSeadragon.Point(event.clientX, event.clientY);
    const distance = startMousePosition!.distanceTo(currentPos);

    // Mark as dragging if movement exceeds a threshold (e.g., 3px)
    isDragging = distance > 3;

    if (isDragging && startMousePosition) {
      // Get the current mouse position
      const currentMousePosition = new OpenSeadragon.Point(
        event.clientX,
        event.clientY,
      );

      // Calculate the delta between the last position and the current position
      const deltaX = currentMousePosition.x - startMousePosition.x;
      const deltaY = currentMousePosition.y - startMousePosition.y;

      // Use OpenSeadragon to pan the image
      viewer.viewport.panBy(
        viewer.viewport.deltaPointsFromPixels(
          new OpenSeadragon.Point(-deltaX, -deltaY),
        ),
      );

      // Update the last mouse position
      startMousePosition = currentMousePosition;

      // Prevent default behavior to avoid accidental text selection
      event.preventDefault();
    }
  });

  document.addEventListener('mouseup', (event: MouseEvent) => {
    const clickDuration = Date.now() - clickStart;
    const isClick = !isDragging && clickDuration < 200; // Allow quick clicks under 200ms

    if (isClick && !isDragging) {
      // Trigger zoom behavior
      const bbox = (event.target as SVGGraphicsElement).getBBox();
      const viewportRect = viewer.viewport.imageToViewportRectangle(
        bbox.x,
        bbox.y,
        bbox.width,
        bbox.height,
      );
      viewer.viewport.fitBounds(viewportRect, true); // Smooth zoom
    }

    // Reset interaction state
    isDragging = false;
    clickStart = 0;
    startMousePosition = null;
  });
};

// Function to update the SVG overlay's position and scale
const updateOverlay = (viewer: OpenSeadragon.Viewer, svg: SVGSVGElement) => {
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
  const runUpdateOverlay = () => updateOverlay(viewer, svg);

  viewer.addHandler('animation', runUpdateOverlay); // For smooth zooming and panning
  viewer.addHandler('resize', runUpdateOverlay); // For Responsive Resize
  viewer.addHandler('open', runUpdateOverlay); // When viewer initializes
  viewer.addHandler('open', () => {
    (Array.from(allZones.children) as SVGGeometryElement[]).forEach(
      (element) => {
        element.style.opacity = '0';
        handleInteractions(viewer, element);
      },
    );
  });
};

document.addEventListener('DOMContentLoaded', main);
