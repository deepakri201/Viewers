import { metaData, utilities, type Types } from '@cornerstonejs/core';

const { transformIndexToWorld, imageToWorldCoords } = utilities;

type GraphicQuad = [number, number, number, number];
type IndexPoint3 = [number, number, number];
type ImagePixelPair = [number, number];

type ConversionCandidate = {
  name: string;
  p1: Types.Point3;
  p2: Types.Point3;
};

function getInstanceMeta(imageId: string) {
  return metaData.get('instance', imageId) as {
    PixelSpacing?: number[];
    Rows?: number;
    Columns?: number;
    rows?: number;
    columns?: number;
  };
}

/**
 * create_LUS_SR stores GraphicData as coord / PixelSpacing where coord is the
 * same index space OHIF uses in JSON export (transformWorldToIndex).
 */
function buildIndexCandidates(
  graphicData: GraphicQuad,
  pixelSpacing?: number[]
): { p1: IndexPoint3; p2: IndexPoint3; name: string }[] {
  const [g0, g1, g2, g3] = graphicData;
  const rowSpacing = Number(pixelSpacing?.[0]) || 1;
  const colSpacing = Number(pixelSpacing?.[1]) || rowSpacing;

  return [
    {
      name: 'lus-inverse',
      p1: [g0 * rowSpacing, g1 * colSpacing, 0],
      p2: [g2 * rowSpacing, g3 * colSpacing, 0],
    },
    {
      name: 'direct-index',
      p1: [g0, g1, 0],
      p2: [g2, g3, 0],
    },
    {
      name: 'swap-index',
      p1: [g1, g0, 0],
      p2: [g3, g2, 0],
    },
    {
      name: 'lus-inverse-swap',
      p1: [g1 * colSpacing, g0 * rowSpacing, 0],
      p2: [g3 * colSpacing, g2 * rowSpacing, 0],
    },
  ];
}

/** imageToWorldCoords expects [row, column] pixel indices. */
function buildImagePixelCandidates(graphicData: GraphicQuad): { p1: ImagePixelPair; p2: ImagePixelPair; name: string }[] {
  const [g0, g1, g2, g3] = graphicData;

  return [
    { name: 'image-row-col', p1: [g0, g1], p2: [g2, g3] },
    { name: 'image-col-row', p1: [g1, g0], p2: [g3, g2] },
  ];
}

function scoreWorldPoints(
  viewport: Types.IStackViewport,
  p1: Types.Point3,
  p2: Types.Point3
): number {
  const c1 = viewport.worldToCanvas(p1);
  const c2 = viewport.worldToCanvas(p2);

  if (!c1 || !c2 || c1.some(v => !Number.isFinite(v)) || c2.some(v => !Number.isFinite(v))) {
    return -1;
  }

  const width = viewport.canvas?.clientWidth || 1;
  const height = viewport.canvas?.clientHeight || 1;
  let score = 0;

  for (const [x, y] of [c1, c2]) {
    if (x >= -width * 0.15 && x <= width * 1.15 && y >= -height * 0.15 && y <= height * 1.15) {
      score += 2;
    }
  }

  const distance = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
  if (distance > 8) {
    score += 2;
  }
  if (distance > 24) {
    score += 1;
  }

  return score;
}

function pickBestCandidate(
  candidates: Array<ConversionCandidate & { score: number }>
): ConversionCandidate | null {
  let best: (ConversionCandidate & { score: number }) | null = null;

  for (const candidate of candidates) {
    if (candidate.score > (best?.score ?? -1)) {
      best = candidate;
    }
  }

  return best && best.score >= 4 ? best : null;
}

/**
 * Converts SR SCOORD POLYLINE GraphicData to world points using the viewport's
 * imageData at the referenced frame. Tries several index/image pixel layouts and
 * picks the one that maps into the viewport canvas (same space as manual draw).
 */
export default function convertSRGraphicDataToWorldPoints(
  graphicData: number[],
  imageId: string,
  viewport: Types.IStackViewport
): [Types.Point3, Types.Point3] | null {
  if (!graphicData || graphicData.length < 4 || !viewport) {
    return null;
  }

  const points = graphicData.slice(0, 4) as GraphicQuad;
  const instance = getInstanceMeta(imageId);
  const pixelSpacing = instance?.PixelSpacing;
  const imageData = viewport.getImageData()?.imageData;

  const candidates: (ConversionCandidate & { score: number })[] = [];

  if (imageData) {
    for (const indexCandidate of buildIndexCandidates(points, pixelSpacing)) {
      const p1 = transformIndexToWorld(imageData, indexCandidate.p1);
      const p2 = transformIndexToWorld(imageData, indexCandidate.p2);
      candidates.push({
        name: indexCandidate.name,
        p1,
        p2,
        score: scoreWorldPoints(viewport, p1, p2),
      });
    }
  }

  for (const pixelCandidate of buildImagePixelCandidates(points)) {
    try {
      const p1 = imageToWorldCoords(imageId, pixelCandidate.p1);
      const p2 = imageToWorldCoords(imageId, pixelCandidate.p2);
      if (!p1 || !p2) {
        continue;
      }
      candidates.push({
        name: pixelCandidate.name,
        p1,
        p2,
        score: scoreWorldPoints(viewport, p1, p2),
      });
    } catch {
      // imagePlaneModule may be missing until the frame is loaded in the viewport
    }
  }

  const best = pickBestCandidate(candidates);
  return best ? [best.p1, best.p2] : null;
}
