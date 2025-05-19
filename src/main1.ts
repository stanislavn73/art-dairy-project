import OpenSeadragon from 'openseadragon';
import './openseadragon-svg-overlay';
import { appendScaledSvgGroupsAndPaths } from './svg-overlay-utils.ts';

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

// Ensure the image fits the viewer when loaded
viewer.addHandler('open', function () {
  viewer.viewport.goHome();
});

viewer.addHandler('open', function () {
  viewer.viewport.goHome();

  // Add SVG overlay after image is loaded
  viewer.svgOverlay();
  fetch('/mvp_hotspots.svg')
    .then((response) => response.text())
    .then((svgText) => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = svgDoc.documentElement as unknown as SVGSVGElement;
      // Remove width/height to let overlay handle scaling
      svgElement.removeAttribute('width');
      svgElement.removeAttribute('height');
      console.log(svgElement);

      const tiledImage = viewer.world.getItemAt(0);
      const originalWidth = tiledImage.getContentSize().x;
      const originalHeight = tiledImage.getContentSize().y;
      const processedWidth = viewer.container.clientWidth;
      const processedHeight = viewer.container.clientHeight;

      const node = viewer.svgOverlay().node() as SVGGElement;
      appendScaledSvgGroupsAndPaths(
        svgElement,
        node,
        originalWidth,
        originalHeight,
        processedWidth,
        processedHeight,
      );

      // Array.from(svgElement.children).forEach((child) => {
      //   console.log(child);
      //   overlay.node().appendChild(child.cloneNode(true));
      // });

      // Add interactivity to zones
      // svgElement.querySelectorAll('[id^="zone"]').forEach((zone: Element) => {
      //   zone.addEventListener('mouseenter', () => {
      //     // Get the bounding box of the zone
      //     const bbox = (zone as SVGGraphicsElement).getBBox();
      //     // Convert SVG coordinates to image coordinates
      //     const imageRect = viewer.viewport.imageToViewportRectangle(
      //       bbox.x,
      //       bbox.y,
      //       bbox.width,
      //       bbox.height,
      //     );
      //     // Zoom to the zone
      //     viewer.viewport.fitBounds(imageRect, true);
      //   });
      //   zone.addEventListener('mouseleave', () => {
      //     // Optionally, zoom out or go home
      //     viewer.viewport.goHome();
      //   });
      //   // Optionally, style the zone for hover
      //   zone.addEventListener('mouseover', () => {
      //     (zone as SVGElement).style.opacity = '0.5';
      //   });
      //   zone.addEventListener('mouseout', () => {
      //     (zone as SVGElement).style.opacity = '1';
      //   });
      // });
    });
});
