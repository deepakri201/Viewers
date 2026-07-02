import { cache, metaData, utilities, type Types } from '@cornerstonejs/core';

const { transformIndexToWorld, imageToWorldCoords } = utilities;

type GraphicPointPair = [number, number, number, number];

/**
 * create_LUS_SR writes SCOORD GraphicData as JSON_coord / PixelSpacing (see
 * save_SR_for_case_polyline in deepakri201/create_LUS_SR). OHIF JSON export
 * stores index/pixel coords from transformWorldToIndex, so we must multiply by
 * spacing before transformIndexToWorld — not use imageToWorldCoords directly.
 *
 * SR saved from this viewer (worldToImageCoords) already stores true DICOM pixels.
 */
export function usesCreateLusSrGraphicEncoding(
  measurement: { TrackingIdentifier?: string },
  graphicData: number[],
  rows?: number,
  columns?: number
): boolean {
  const trackingId = measurement.TrackingIdentifier || '';

  if (/^(pleura|bline)_f\d+_\d+$/i.test(trackingId)) {
    return true;
  }

  if (rows && columns) {
    const maxDim = Math.max(rows, columns);
    const maxCoord = Math.max(...graphicData.slice(0, 4).map(v => Math.abs(v)));
    if (maxCoord > maxDim * 1.5) {
      return true;
    }
  }

  return false;
}

function getImageDataForImageId(imageId: string): Types.IImageData | undefined {
  const cachedImage = cache.getImage(imageId) as { imageData?: Types.IImageData } | undefined;
  return cachedImage?.imageData;
}

function graphicDataToWorldViaIndexSpace(
  graphicData: GraphicPointPair,
  imageId: string,
  pixelSpacing: number[]
): [Types.Point3, Types.Point3] | null {
  const imageData = getImageDataForImageId(imageId);
  if (!imageData) {
    return null;
  }

  const rowSpacing = Number(pixelSpacing[0]) || 1;
  const colSpacing = Number(pixelSpacing[1]) || rowSpacing;

  // Inverse of create_LUS_SR: graphic = coord / PixelSpacing
  const startX = graphicData[0] * rowSpacing;
  const startY = graphicData[1] * colSpacing;
  const endX = graphicData[2] * rowSpacing;
  const endY = graphicData[3] * colSpacing;

  const point1World = transformIndexToWorld(imageData, [startX, startY, 0]);
  const point2World = transformIndexToWorld(imageData, [endX, endY, 0]);

  return [point1World, point2World];
}

function graphicDataToWorldViaImagePixels(
  graphicData: GraphicPointPair,
  imageId: string
): [Types.Point3, Types.Point3] | null {
  const point1World = imageToWorldCoords(imageId, [graphicData[0], graphicData[1]]);
  const point2World = imageToWorldCoords(imageId, [graphicData[2], graphicData[3]]);

  if (!point1World || !point2World) {
    return null;
  }

  return [point1World, point2World];
}

/**
 * Converts DICOM SR SCOORD POLYLINE GraphicData to world-space endpoints for
 * UltrasoundPleuraBLineTool (same space as manual drawing).
 */
export default function convertSRGraphicDataToWorldPoints(
  graphicData: number[],
  imageId: string,
  measurement: { TrackingIdentifier?: string }
): [Types.Point3, Types.Point3] | null {
  if (!graphicData || graphicData.length < 4) {
    return null;
  }

  const points = graphicData.slice(0, 4) as GraphicPointPair;
  const instance = metaData.get('instance', imageId) as {
    PixelSpacing?: number[];
    Rows?: number;
    Columns?: number;
    rows?: number;
    columns?: number;
  };

  const rows = instance?.Rows ?? instance?.rows;
  const columns = instance?.Columns ?? instance?.columns;
  const pixelSpacing = instance?.PixelSpacing;

  if (
    pixelSpacing?.length >= 2 &&
    usesCreateLusSrGraphicEncoding(measurement, points, rows, columns)
  ) {
    const worldPoints = graphicDataToWorldViaIndexSpace(points, imageId, pixelSpacing);
    if (worldPoints) {
      return worldPoints;
    }
  }

  return graphicDataToWorldViaImagePixels(points, imageId);
}
