import { metaData, utilities, type Types } from '@cornerstonejs/core';

const { imageToWorldCoords } = utilities;

type GraphicQuad = [number, number, number, number];

/**
 * Converts SR SCOORD POLYLINE GraphicData to world points for UltrasoundPleuraBLineTool.
 *
 * Uses the same conversion as OHIF's SR overlay (`getRenderableData` / `scoordToWorld`):
 * pass GraphicData straight into `imageToWorldCoords`.
 *
 * create_LUS_SR writes GraphicData as JSON_coord / PixelSpacing (e.g. ~610, not ~163).
 * `imageToWorldCoords` already applies row/column pixel spacing internally, so multiplying
 * GraphicData by spacing again would double-apply spacing and shrink lines toward the origin.
 */
export default function convertSRGraphicDataToWorldPoints(
  graphicData: number[],
  imageId: string
): [Types.Point3, Types.Point3] | null {
  if (!graphicData || graphicData.length < 4) {
    return null;
  }

  const quad = graphicData.slice(0, 4) as GraphicQuad;

  try {
    const point1World = imageToWorldCoords(imageId, [quad[0], quad[1]]);
    const point2World = imageToWorldCoords(imageId, [quad[2], quad[3]]);

    if (!point1World || !point2World) {
      return null;
    }

    return [point1World, point2World];
  } catch {
    return null;
  }
}

export function getFrameOfReferenceUID(imageId: string): string | undefined {
  const imagePlaneModule = metaData.get('imagePlaneModule', imageId) as {
    frameOfReferenceUID?: string;
  };
  return imagePlaneModule?.frameOfReferenceUID;
}
