/**
 * Wait for DOM and both images to be fully loaded before initializing canvas logic.
 */
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const originalImage = document.getElementById(
    'originalImage',
  ) as HTMLImageElement;
  const animals = document.getElementById('animals') as HTMLImageElement;

  if (!canvas || !originalImage || !animals) {
    console.error('Canvas or image elements not found in the DOM.');
    return;
  }

  const context = canvas.getContext('2d')!;
  if (!context) {
    console.error('Failed to get canvas 2D context.');
    return;
  }

  // Helper to check if a pixel is non-transparent in the animals image
function isAnimalPixel(alpha: number): boolean {
  return alpha > 0; // Consider any non-transparent pixel as part of an animal
}

// We'll store the area labels and border masks
let areaLabels: Uint16Array | null = null; // Each pixel: 0 = background, >0 = area ID
let animalsData: ImageData | null = null;
let originalImageData: ImageData | null = null;

// Animation variables
let animationFrameId: number | null = null;
let hoveredAreaID: number | null = null;
let animationStartTime: number | null = null;

// Connected component labeling (4-connectivity)
function labelAnimalAreas(
  width: number,
  height: number,
  animalsData: ImageData,
): Uint16Array {
  const labels = new Uint16Array(width * height);
  let currentLabel = 1;
  const visited = new Uint8Array(width * height);

  function floodFill(sx: number, sy: number) {
    const stack = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      if (visited[idx]) continue;
      visited[idx] = 1;
      labels[idx] = currentLabel;
      // 4-connectivity
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx,
          ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nidx = ny * width + nx;
          const ni = nidx * 4;
          if (
            !visited[nidx] &&
            isAnimalPixel(
              animalsData.data[ni + 3],
            )
          ) {
            stack.push([nx, ny]);
          }
        }
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const i = idx * 4;
      if (
        !visited[idx] &&
        isAnimalPixel(
          animalsData.data[i + 3],
        )
      ) {
        floodFill(x, y);
        currentLabel++;
      }
    }
  }
  return labels;
}

// Precompute area labels and border masks, and store original image data
function computeAreaLabelsAndBorders() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

  // Create offscreen canvas for animals image
  const offscreenAnimals = new OffscreenCanvas(canvas.width, canvas.height);
  const ctxAnimals = offscreenAnimals.getContext('2d')!;

  ctxAnimals.drawImage(animals, 0, 0, canvas.width, canvas.height);

  animalsData = ctxAnimals.getImageData(0, 0, canvas.width, canvas.height);
  originalImageData = context.getImageData(0, 0, canvas.width, canvas.height);

  const width = canvas.width;
  const height = canvas.height;

  // Label areas
  areaLabels = labelAnimalAreas(width, height, animalsData);

  // We still compute area IDs but don't need to compute border masks anymore
  // since we're not drawing borders
}

// Animation loop for wave effect overlay (opacity moving from left to right)
function animateWaveOpacity() {
  if (hoveredAreaID === null || !originalImageData || !areaLabels) return;
  const now = performance.now();
  if (animationStartTime === null) animationStartTime = now;
  const elapsed = (now - animationStartTime) / 1000; // seconds

  // Wave parameters
  const period = 2; // seconds for a full cycle
  const spatialFreq = (2 * Math.PI) / canvas.width; // one full wave across the width

  // Copy original image data
  const resultData = new Uint8ClampedArray(originalImageData.data);

  // Apply wave effect to the hovered area
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = y * canvas.width + x;
      if (areaLabels[idx] === hoveredAreaID) {
        // Calculate phase for this x position (moving wave from left to right)
        const phase = (2 * Math.PI * elapsed) / period - x * spatialFreq;
        // Value oscillates from 1.0 to 0.5
        const alphaNorm = Math.sin(phase) * 0.25 + 0.75; // 0.5 to 1.0
        const waveAlpha = Math.round(alphaNorm * 255);

        const pixelIndex = idx * 4;
        // Keep original RGB values but modify alpha (128-255 range)
        resultData[pixelIndex + 3] = waveAlpha;
      }
    }
  }

  // No border drawing - only wave opacity effect

  const resultImageData = new ImageData(
    resultData,
    canvas.width,
    canvas.height,
  );
  context.putImageData(resultImageData, 0, 0);

  animationFrameId = requestAnimationFrame(animateWaveOpacity);
}

// Draw the original image without any borders
function drawImageWithAreaBorder() {
  if (!originalImageData) return;
  // Simply restore the original image without any borders
  context.putImageData(originalImageData, 0, 0);
}

// Helper to get mouse position relative to canvas
function getMousePos(evt: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor((evt.clientX - rect.left) * (canvas.width / rect.width)),
    y: Math.floor((evt.clientY - rect.top) * (canvas.height / rect.height)),
  };
}

// Get area ID at mouse position
function getAreaIDAt(x: number, y: number): number | null {
  if (!areaLabels) return null;
  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return null;
  const idx = y * canvas.width + x;
  const areaID = areaLabels[idx];
  return areaID > 0 ? areaID : null;
}

// Main process
function processImages() {
  computeAreaLabelsAndBorders();
  drawImageWithAreaBorder(); // Draw no borders by default

  // Add hover effect with wave animation for independent areas
  canvas.addEventListener('mousemove', (evt) => {
    const { x, y } = getMousePos(evt);
    const areaID = getAreaIDAt(x, y);

    if (areaID) {
      if (hoveredAreaID !== areaID) {
        // New area hovered - reset animation
        hoveredAreaID = areaID;
        animationStartTime = null;

        // Cancel existing animation if any
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }

        // Start new animation
        animateWaveOpacity();
      }
    } else {
      // No area hovered - stop animation and clear
      hoveredAreaID = null;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      drawImageWithAreaBorder(); // Draw no borders
    }
  });

  canvas.addEventListener('mouseleave', () => {
    // Mouse left canvas - stop animation and clear
    hoveredAreaID = null;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    drawImageWithAreaBorder(); // Restore to no borders
  });
}

  // Helper function to check if an image is fully loaded
  function isImageLoaded(img: HTMLImageElement): boolean {
    return img.complete && img.naturalWidth !== 0;
  }

  let loaded = 0;
  function checkLoaded() {
    loaded++;
    if (loaded === 2) processImages();
  }

  // Attach listeners and check immediately in case images are already loaded
  if (isImageLoaded(originalImage)) {
    checkLoaded();
  } else {
    originalImage.addEventListener('load', checkLoaded);
    originalImage.addEventListener('error', () => {
      console.error('Failed to load originalImage');
    });
  }

  if (isImageLoaded(animals)) {
    checkLoaded();
  } else {
    animals.addEventListener('load', checkLoaded);
    animals.addEventListener('error', () => {
      console.error('Failed to load animals image');
    });
  }
});
