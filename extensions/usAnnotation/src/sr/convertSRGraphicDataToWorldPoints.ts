import { metaData, utilities, type Types } from '@cornerstonejs/core';

const { imageToWorldCoords } = utilities;

type GraphicQuad = [number, number, number, number];

function getPixelSpacing(imageId: string): [number, number] {
  const instance = metaData.get('instance', imageId) as { PixelSpacing?: number[] };
  const imagePlane = metaData.get('imagePlaneModule', imageId) as {
    rowPixelSpacing?: number;
    columnPixelSpacing?: number;
  };

  const rowSpacing = Number(
    instance?.PixelSpacing?.[0] ?? imagePlane?.rowPixelSpacing ?? 1
  );
  const colSpacing = Number(
    instance?.PixelSpacing?.[1] ?? imagePlane?.columnPixelSpacing ?? rowSpacing
  );

  return [rowSpacing, colSpacing];
}

/**
 * SRs from create_LUS_SR store GraphicData as index_coord / PixelSpacing.
 * OHIF-saved SRs store true DICOM pixel coords (via worldToImageCoords).
 */
export function usesCreateLusSrGraphicEncoding(measurement: {
  TrackingIdentifier?: string;
}): boolean {
  const trackingId = measurement.TrackingIdentifier || '';
  return /^(pleura|bline)_f\d+_\d+$/i.test(trackingId);
}

/**
 * Converts SR SCOORD POLYLINE GraphicData to world points using the same
 * imageToWorldCoords path as DICOMSRDisplay / getRenderableData.
 *
 * For create_LUS_SR: undo the PixelSpacing division before imageToWorldCoords.
 */
export default function convertSRGraphicDataToWorldPoints(
  graphicData: number[],
  imageId: string,
  measurement: { TrackingIdentifier?: string }
): [Types.Point3, Types.Point3] | null {
  if (!graphicData || graphicData.length < 4) {
    return null;
  }

  const [g0, g1, g2, g3] = graphicData.slice(0, 4) as GraphicQuad;
  const [rowSpacing, colSpacing] = getPixelSpacing(imageId);

  const scaleRow = usesCreateLusSrGraphicEncoding(measurement) ? rowSpacing : 1;
  const scaleCol = usesCreateLusSrGraphicEncoding(measurement) ? colSpacing : 1;

  // create_LUS_SR: graphic = start_x/PixelSpacing[0], start_y/PixelSpacing[1]
  // imageToWorldCoords expects [row, column] pixel indices
  const row1 = g0 * scaleRow;
  const col1 = g1 * scaleCol;
  const row2 = g2 * scaleRow;
  const col2 = g3 * scaleCol;

  try {
    const point1World = imageToWorldCoords(imageId, [row1, col1]);
    const point2World = imageToWorldCoords(imageId, [row2, col2]);

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
