import { classes } from '@ohif/core';

const { MetadataProvider: metadataProvider } = classes;

/**
 * Resolves frame-specific imageIds for SR measurements from loaded US display sets.
 * Required before hydration so SCOORD pixel coordinates convert to world space correctly.
 */
export default function resolveSRMeasurementImageIds(
  srDisplaySet,
  displaySetService,
  extensionManager
) {
  if (!srDisplaySet?.measurements?.length) {
    return false;
  }

  const dataSources = extensionManager.getActiveDataSource();
  const dataSource = dataSources?.[0];
  if (!dataSource?.getImageIdsForDisplaySet) {
    return false;
  }

  let resolvedAny = false;

  const candidateDisplaySets = displaySetService.activeDisplaySets.filter(
    displaySet =>
      !displaySet.isDerivedDisplaySet &&
      displaySet.Modality === 'US' &&
      displaySet.images?.length
  );

  for (const imageDisplaySet of candidateDisplaySets) {
    const imageIdMap = new Map<string, string>();
    const imageIds = dataSource.getImageIdsForDisplaySet(imageDisplaySet);

    for (const imageId of imageIds) {
      const { SOPInstanceUID, frameNumber } = metadataProvider.getUIDsFromImageID(imageId);
      if (!SOPInstanceUID) {
        continue;
      }
      const key = `${SOPInstanceUID}:${frameNumber || 1}`;
      if (!imageIdMap.has(key)) {
        imageIdMap.set(key, imageId);
      }
    }

    for (const measurement of srDisplaySet.measurements) {
      if (measurement.imageId) {
        continue;
      }

      const referencedSOPSequence = measurement.coords?.[0]?.ReferencedSOPSequence;
      if (!referencedSOPSequence?.ReferencedSOPInstanceUID) {
        continue;
      }

      const frame = referencedSOPSequence.ReferencedFrameNumber || 1;
      const key = `${referencedSOPSequence.ReferencedSOPInstanceUID}:${frame}`;
      const imageId = imageIdMap.get(key);

      if (!imageId) {
        continue;
      }

      measurement.imageId = imageId;
      measurement.ReferencedSOPInstanceUID = referencedSOPSequence.ReferencedSOPInstanceUID;
      measurement.frameNumber = frame;
      measurement.displaySetInstanceUID = imageDisplaySet.displaySetInstanceUID;
      measurement.loaded = true;
      resolvedAny = true;
    }
  }

  return resolvedAny;
}
