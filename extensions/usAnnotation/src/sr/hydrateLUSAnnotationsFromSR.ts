import { UltrasoundPleuraBLineTool, annotation, Enums as csToolsEnums } from '@cornerstonejs/tools';
import { cache, eventTarget, imageLoader, triggerEvent } from '@cornerstonejs/core';

import classifyLUSMeasurementType from './classifyLUSMeasurementType';
import convertSRGraphicDataToWorldPoints from './convertSRGraphicDataToWorldPoints';
import {
  buildImageIdMap,
  findUSDisplaySetForMeasurements,
  resolveMeasurementImageId,
} from './resolveLUSMeasurementImageIds';

const SR_SOP_CLASS_HANDLER_ID =
  '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr';

const { addAnnotation, getAnnotations, removeAnnotation } = annotation.state;

async function ensureImageLoaded(imageId: string) {
  if (cache.getImage(imageId)) {
    return;
  }
  await imageLoader.loadAndCacheImage(imageId);
}

export type HydrateLUSFromSRResult = {
  added: number;
  skipped: number;
  errors: string[];
};

function findSRDisplaySet(displaySetService, displaySetInstanceUID?: string) {
  const srDisplaySets = displaySetService.activeDisplaySets.filter(
    displaySet => displaySet.SOPClassHandlerId === SR_SOP_CLASS_HANDLER_ID
  );

  if (!srDisplaySets.length) {
    return null;
  }

  if (displaySetInstanceUID) {
    return srDisplaySets.find(ds => ds.displaySetInstanceUID === displaySetInstanceUID) ?? null;
  }

  return srDisplaySets[0];
}

function findViewportForDisplaySet(
  viewportGridService,
  cornerstoneViewportService,
  displaySetInstanceUID: string
) {
  const { viewports } = viewportGridService.getState();

  for (const [viewportId, viewport] of viewports) {
    if (viewport.displaySetInstanceUIDs?.includes(displaySetInstanceUID)) {
      const cornerstoneViewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      if (cornerstoneViewport?.element) {
        return { viewportId, viewport: cornerstoneViewport };
      }
    }
  }

  const activeViewportId = viewportGridService.getActiveViewportId();
  const activeViewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);

  if (activeViewport?.element) {
    return { viewportId: activeViewportId, viewport: activeViewport };
  }

  return null;
}

function clearExistingLUSAnnotations(element) {
  const existing = getAnnotations(UltrasoundPleuraBLineTool.toolName, element) ?? [];
  for (const existingAnnotation of existing) {
    removeAnnotation(existingAnnotation.annotationUID);
  }
}

function createLUSAnnotation({
  imageId,
  annotationType,
  graphicData,
  measurement,
  viewport,
}) {
  const worldPoints = convertSRGraphicDataToWorldPoints(graphicData, imageId, measurement);

  if (!worldPoints) {
    return null;
  }

  const [point1World, point2World] = worldPoints;
  const { viewUp, position: cameraPosition } = viewport.getCamera();

  return {
    highlighted: false,
    invalidated: false,
    metadata: {
      ...viewport.getViewReference({ points: [point1World] }),
      toolName: UltrasoundPleuraBLineTool.toolName,
      referencedImageId: imageId,
      viewUp,
      cameraPosition,
    },
    data: {
      handles: {
        points: [point1World, point2World],
        activeHandleIndex: null,
      },
      annotationType,
      label: '',
    },
  };
}

/**
 * Imports pleura/B-line geometry from a DICOM SR into UltrasoundPleuraBLineTool
 * annotations on the US viewport — matching how a user would draw them manually.
 */
export default async function hydrateLUSAnnotationsFromSR({
  servicesManager,
  extensionManager,
  displaySetInstanceUID,
  replaceExisting = true,
}: {
  servicesManager: AppTypes.ServicesManager;
  extensionManager: AppTypes.ExtensionManager;
  displaySetInstanceUID?: string;
  replaceExisting?: boolean;
}): Promise<HydrateLUSFromSRResult> {
  const { displaySetService, viewportGridService, cornerstoneViewportService } =
    servicesManager.services;

  const result: HydrateLUSFromSRResult = { added: 0, skipped: 0, errors: [] };

  const srDisplaySet = findSRDisplaySet(displaySetService, displaySetInstanceUID);
  if (!srDisplaySet) {
    result.errors.push('No structured report display set found in this study');
    return result;
  }

  if (!srDisplaySet.isLoaded && srDisplaySet.load) {
    await srDisplaySet.load();
  }

  const measurements = srDisplaySet.measurements ?? [];
  if (!measurements.length) {
    result.errors.push('Structured report contains no measurements');
    return result;
  }

  const dataSource = extensionManager.getActiveDataSource()?.[0];
  if (!dataSource) {
    result.errors.push('No active data source');
    return result;
  }

  const usDisplaySet = findUSDisplaySetForMeasurements(
    displaySetService,
    measurements,
    dataSource
  );

  if (!usDisplaySet) {
    result.errors.push('No ultrasound display set found for this study');
    return result;
  }

  const viewportMatch = findViewportForDisplaySet(
    viewportGridService,
    cornerstoneViewportService,
    usDisplaySet.displaySetInstanceUID
  );

  if (!viewportMatch) {
    result.errors.push('No viewport available for the ultrasound series');
    return result;
  }

  const { viewport } = viewportMatch;
  const imageIdMap = buildImageIdMap(dataSource, usDisplaySet);

  if (replaceExisting) {
    clearExistingLUSAnnotations(viewport.element);
  }

  const imageIdsToLoad = new Set<string>();

  for (const measurement of measurements) {
    if (!classifyLUSMeasurementType(measurement)) {
      continue;
    }
    const imageId = resolveMeasurementImageId(measurement, imageIdMap);
    if (imageId) {
      imageIdsToLoad.add(imageId);
    }
  }

  await Promise.all([...imageIdsToLoad].map(imageId => ensureImageLoaded(imageId)));

  for (const measurement of measurements) {
    const annotationType = classifyLUSMeasurementType(measurement);
    if (!annotationType) {
      result.skipped += 1;
      continue;
    }

    const coord = measurement.coords?.[0];
    if (coord?.GraphicType !== 'POLYLINE' || !coord?.GraphicData || coord.GraphicData.length < 4) {
      result.skipped += 1;
      continue;
    }

    const imageId = resolveMeasurementImageId(measurement, imageIdMap);
    if (!imageId) {
      result.skipped += 1;
      result.errors.push(
        `Could not resolve image for ${measurement.TrackingIdentifier ?? 'measurement'}`
      );
      continue;
    }

    const graphicData = coord.GraphicData;
    const newAnnotation = createLUSAnnotation({
      imageId,
      annotationType,
      graphicData,
      measurement,
      viewport,
    });

    if (!newAnnotation) {
      result.skipped += 1;
      continue;
    }

    addAnnotation(newAnnotation, viewport.element);
    result.added += 1;
  }

  if (result.added > 0) {
    triggerEvent(eventTarget, csToolsEnums.Events.ANNOTATION_MODIFIED, {
      annotation: {
        metadata: {
          toolName: UltrasoundPleuraBLineTool.toolName,
        },
      },
    });
    viewportGridService.setActiveViewportId(viewportMatch.viewportId);
    viewport.render();
  }

  return result;
}
