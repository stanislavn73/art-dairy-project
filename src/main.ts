import OpenSeadragon from 'openseadragon';

const main = () => {
  const viewer = OpenSeadragon({
    id: 'openseadragon-viewer',
    showNavigationControl: false,
    tileSources: '/dzi.dzi',
    maxZoomPixelRatio: 2,
    visibilityRatio: 1,
    minZoomLevel: 1,
    defaultZoomLevel: 1,
    homeFillsViewer: true, // Ensures the image fits within the viewer
  });

  viewer.addHandler('animation', updateOverlay);
  viewer.addHandler('resize', updateOverlay);
  viewer.addHandler('open', updateOverlay);

  // Get the bounding box of an SVG element in image coordinates
  function getImageBBox(element: SVGGraphicsElement) {
    // getBBox() returns the bounding box in the SVG's coordinate system,
    // which matches the image coordinates if viewBox is set correctly.
    const bbox = element.getBBox();
    return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
  }

  const svg = document.getElementById(
    'custom-svg-overlay',
  ) as unknown as SVGSVGElement;
  const allZones = document.getElementById('all-zones');

  function updateOverlay() {
    const tiledImage = viewer.world.getItemAt(0);
    const imageWidth = tiledImage.getContentSize().x;
    const imageHeight = tiledImage.getContentSize().y;
    const g = svg.children.item(0) as SVGGraphicsElement;

    // Get the image-to-screen transform
    const topLeft = viewer.viewport.imageToViewerElementCoordinates(
      new OpenSeadragon.Point(0, 0),
    );
    const bottomRight = viewer.viewport.imageToViewerElementCoordinates(
      new OpenSeadragon.Point(imageWidth, imageHeight),
    );
    const scaleX = (bottomRight.x - topLeft.x) / imageWidth;
    const scaleY = (bottomRight.y - topLeft.y) / imageHeight;

    // Set the transform on the group
    g.setAttribute(
      'transform',
      `translate(${topLeft.x},${topLeft.y}) scale(${scaleX},${scaleY})`,
    );
    Array.from(allZones.children).forEach((child) => {
      (child as SVGGraphicsElement).setAttribute('fill', 'black');
      (child as SVGGraphicsElement).setAttribute('pointer-events', 'auto');
      (child as SVGGraphicsElement).style.pointerEvents = 'auto';
      (child as SVGGraphicsElement).style.cursor = 'pointer';
      // (child as SVGGraphicsElement).style.opacity = '0';
      // Only add event listeners once
      if (!(child as any)._osdClickAttached) {
        (child as any)._osdClickAttached = true;
        child.addEventListener('click', (event) => {
          event.stopPropagation();

          // Get the bounding box of the clicked path in image coordinates
          const bbox = getImageBBox(child as SVGGraphicsElement);

          // Get the rectangle in viewport coordinates based on image bbox
          const viewportRect = viewer.viewport.imageToViewportRectangle(
            bbox.x,
            bbox.y,
            bbox.width,
            bbox.height,
          );

          // Ensure smooth zooming to the bounds
          viewer.viewport.fitBounds(viewportRect, true); // true enables animation
        });
      }
    });

    if (allZones) {
    }
  }
};

document.addEventListener('DOMContentLoaded', main);
