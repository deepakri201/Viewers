import resolveSRMeasurementImageIds from './resolveSRMeasurementImageIds';

const SR_SOP_CLASS_HANDLER_IDS = new Set([
  '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr',
  '@ohif/extension-cornerstone-dicom-sr.sopClassHandlerModule.dicom-sr-3d',
]);

function isSRDisplaySet(displaySet) {
  return displaySet && SR_SOP_CLASS_HANDLER_IDS.has(displaySet.SOPClassHandlerId);
}

function measurementsReadyForHydration(displaySet) {
  const measurements = displaySet?.measurements || [];
  if (!measurements.length) {
    return false;
  }

  return measurements.every(
    measurement =>
      measurement.imageId ||
      !measurement.coords?.[0]?.ReferencedSOPSequence?.ReferencedSOPInstanceUID
  );
}

/**
 * Subscribes to display set changes and auto-hydrates rehydratable SRs once their
 * measurements are linked to frame-specific US imageIds.
 */
export default function setupAutoHydrateSR({
  servicesManager,
  extensionManager,
  commandsManager,
}: {
  servicesManager: AppTypes.ServicesManager;
  extensionManager: AppTypes.ExtensionManager;
  commandsManager: AppTypes.CommandsManager;
}) {
  const { displaySetService, viewportGridService } = servicesManager.services;
  let hydrateInProgress = false;

  const tryAutoHydrate = async () => {
    if (hydrateInProgress) {
      return;
    }

    const srDisplaySets = displaySetService.activeDisplaySets.filter(
      displaySet =>
        isSRDisplaySet(displaySet) &&
        displaySet.isRehydratable === true &&
        !displaySet.isHydrated
    );

    if (!srDisplaySets.length) {
      return;
    }

    hydrateInProgress = true;

    try {
      for (const srDisplaySet of srDisplaySets) {
        if (!srDisplaySet.isLoaded && srDisplaySet.load) {
          await srDisplaySet.load();
        }

        resolveSRMeasurementImageIds(srDisplaySet, displaySetService, extensionManager);

        if (!measurementsReadyForHydration(srDisplaySet)) {
          continue;
        }

        const activeViewportId = viewportGridService.getActiveViewportId();

        commandsManager.runCommand('loadTrackedSRMeasurements', {
          displaySetInstanceUID: srDisplaySet.displaySetInstanceUID,
          SeriesInstanceUID: srDisplaySet.SeriesInstanceUID,
          viewportId: activeViewportId,
        });
      }
    } finally {
      hydrateInProgress = false;
    }
  };

  const subscriptions = [
    displaySetService.subscribe(displaySetService.EVENTS.DISPLAY_SETS_ADDED, () => {
      window.setTimeout(() => {
        void tryAutoHydrate();
      }, 0);
    }),
    displaySetService.subscribe(displaySetService.EVENTS.DISPLAY_SETS_CHANGED, () => {
      window.setTimeout(() => {
        void tryAutoHydrate();
      }, 0);
    }),
  ];

  window.setTimeout(() => {
    void tryAutoHydrate();
  }, 0);

  return subscriptions;
}
