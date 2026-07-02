import { utilities, type Types } from '@cornerstonejs/core';

const { scroll: scrollViewport } = utilities;

/**
 * Scrolls a stack viewport to the frame matching imageId and waits until that
 * frame's imageData is available (required for transformIndexToWorld).
 */
export default async function scrollViewportToImageId(
  viewport: Types.IStackViewport,
  imageId: string
): Promise<boolean> {
  const imageIds = viewport.getImageIds();
  const targetIndex = imageIds.indexOf(imageId);

  if (targetIndex < 0) {
    return false;
  }

  const delta = targetIndex - viewport.getCurrentImageIdIndex();

  if (delta !== 0) {
    scrollViewport(viewport, { delta });
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (
      viewport.getCurrentImageId() === imageId &&
      viewport.getImageData()?.imageData
    ) {
      return true;
    }
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve());
    });
  }

  return viewport.getCurrentImageId() === imageId && Boolean(viewport.getImageData()?.imageData);
}
