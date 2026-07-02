import { metaData, utilities, type Types } from '@cornerstonejs/core';

const { imageToWorldCoords } = utilities;

type GraphicQuad = [number, number, number, number];

/**
 * Converts SR SCOORD POLYLINE GraphicData to world points for UltrasoundPleuraBLineTool.
 *
 * Same conversion as OHIF's SR overlay (`getRenderableData` / `scoordToWorld`).
 *
 * create_LUS_SR write path (Colab):
 *   GraphicData = JSON_point / PixelSpacing        e.g. 163 / 0.263 ≈ 610
 *
 * Correct read path (spacing applied exactly once, inside imageToWorldCoords):
 *   world = imageToWorldCoords(imageId, GraphicData)
 *   world ≈ PixelSpacing × GraphicData ≈ JSON_point
 *
 * Wrong read path (what produced ~[43, 29] from JSON ~[163, 110]):
 *   recovered = GraphicData × PixelSpacing         → back to 163, 110
 *   world = imageToWorldCoords(imageId, recovered)
 *   world ≈ PixelSpacing × JSON ≈ 0.263 × 163 ≈ 43
 *
 * Do NOT multiply GraphicData by PixelSpacing before imageToWorldCoords — that feeds
 * JSON-scale numbers into a function that already multiplies by spacing.
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
