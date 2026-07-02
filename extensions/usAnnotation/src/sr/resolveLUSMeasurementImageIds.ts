import { classes } from '@ohif/core';

const { MetadataProvider: metadataProvider } = classes;

export function buildImageIdMap(dataSource, displaySet) {
  const imageIdMap = new Map<string, string>();

  if (!dataSource?.getImageIdsForDisplaySet || !displaySet?.images?.length) {
    return imageIdMap;
  }

  const imageIds = dataSource.getImageIdsForDisplaySet(displaySet);

  for (const imageId of imageIds) {
    const { SOPInstanceUID, frameNumber } = metadataProvider.getUIDsFromImageID(imageId);
    if (!SOPInstanceUID) {
      continue;
    }
    const key = `${SOPInstanceUID}:${Number(frameNumber) || 1}`;
    imageIdMap.set(key, imageId);
  }

  return imageIdMap;
}

export function resolveMeasurementImageId(measurement, imageIdMap: Map<string, string>) {
  if (measurement.imageId) {
    return measurement.imageId;
  }

  const referencedSOPSequence = measurement.coords?.[0]?.ReferencedSOPSequence;
  if (!referencedSOPSequence?.ReferencedSOPInstanceUID) {
    return null;
  }

  const frame = Number(referencedSOPSequence.ReferencedFrameNumber) || 1;
  const key = `${referencedSOPSequence.ReferencedSOPInstanceUID}:${frame}`;

  return imageIdMap.get(key) ?? null;
}

export function findUSDisplaySetForMeasurements(displaySetService, measurements, dataSource) {
  const candidates = displaySetService.activeDisplaySets.filter(
    displaySet =>
      !displaySet.isDerivedDisplaySet && displaySet.Modality === 'US' && displaySet.images?.length
  );

  if (!candidates.length) {
    return null;
  }

  if (!measurements?.length) {
    return candidates[0];
  }

  for (const displaySet of candidates) {
    const imageIdMap = buildImageIdMap(dataSource, displaySet);
    const resolvedCount = measurements.filter(measurement =>
      resolveMeasurementImageId(measurement, imageIdMap)
    ).length;

    if (resolvedCount > 0) {
      return displaySet;
    }
  }

  return candidates[0];
}
