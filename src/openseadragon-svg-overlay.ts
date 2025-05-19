// OpenSeadragon SVG Overlay plugin 0.0.5
import openseadragon from 'openseadragon';

const svgNS = 'http://www.w3.org/2000/svg';

declare module 'openseadragon' {
  interface Viewer {
    svgOverlay(): Overlay;
    _svgOverlayInfo?: Overlay;
  }
}

export class Overlay {
  private _viewer: OpenSeadragon.Viewer;
  private _containerWidth: number;
  private _containerHeight: number;
  private _svg: SVGSVGElement;
  private _node: SVGGElement;

  constructor(viewer: OpenSeadragon.Viewer) {
    this._viewer = viewer;
    this._containerWidth = 0;
    this._containerHeight = 0;

    this._svg = document.createElementNS(svgNS, 'svg');
    this._svg.style.position = 'absolute';
    this._svg.style.left = '0';
    this._svg.style.top = '0';
    this._svg.style.width = '100%';
    this._svg.style.height = '100%';
    this._viewer.canvas.appendChild(this._svg);

    this._node = document.createElementNS(svgNS, 'g');
    this._svg.appendChild(this._node);

    this._viewer.addHandler('animation', () => {
      this.resize();
    });

    this._viewer.addHandler('open', () => {
      this.resize();
    });

    this._viewer.addHandler('rotate', () => {
      this.resize();
    });

    this._viewer.addHandler('flip', () => {
      this.resize();
    });

    this._viewer.addHandler('resize', () => {
      this.resize();
    });

    this.resize();
  }

  public node(): SVGGElement {
    return this._node;
  }

  public resize(): void {
    if (this._containerWidth !== this._viewer.container.clientWidth) {
      this._containerWidth = this._viewer.container.clientWidth;
      this._svg.setAttribute('width', this._containerWidth.toString());
    }

    if (this._containerHeight !== this._viewer.container.clientHeight) {
      this._containerHeight = this._viewer.container.clientHeight;
      this._svg.setAttribute('height', this._containerHeight.toString());
    }

    const p = this._viewer.viewport.pixelFromPoint(
      new openseadragon.Point(0, 0),
      true,
    );
    const zoom = this._viewer.viewport.getZoom(true);
    const rotation = this._viewer.viewport.getRotation();
    const flipped = this._viewer.viewport.getFlip();
    // TODO: Expose an accessor for _containerInnerSize in the OSD API so we don't have to use the private variable.
    // @ts-ignore
    const containerSizeX: number = this._viewer.viewport._containerInnerSize.x;
    let scaleX = containerSizeX * zoom;
    let scaleY = scaleX;

    if (flipped) {
      // Makes the x component of the scale negative to flip the svg
      scaleX = -scaleX;
      // Translates svg back into the correct coordinates when the x scale is made negative.
      p.x = -p.x + containerSizeX;
    }

    this._node.setAttribute(
      'transform',
      `translate(${p.x},${p.y}) scale(${scaleX},${scaleY}) rotate(${rotation})`,
    );
  }

  public onClick(
    node: Element,
    handler: (event: OpenSeadragon.MouseTracker.ClickEvent) => void,
  ): void {
    // TODO: Fast click for mobile browsers
    new openseadragon.MouseTracker({
      element: node,
      clickHandler: handler,
    }).setTracking(true);
  }
}

// Attach svgOverlay to the OpenSeadragon.Viewer prototype
(openseadragon.Viewer.prototype as any).svgOverlay = function (): Overlay {
  if (this._svgOverlayInfo) {
    return this._svgOverlayInfo;
  }
  this._svgOverlayInfo = new Overlay(this);
  return this._svgOverlayInfo;
};
