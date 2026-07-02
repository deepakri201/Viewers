import { UltrasoundPleuraBLineTool, Enums as csToolsEnums } from '@cornerstonejs/tools';
import { Types as OhifTypes, utils } from '@ohif/core';
import { eventTarget, triggerEvent, utilities, metaData } from '@cornerstonejs/core';
import { adaptersSR } from '@cornerstonejs/adapters';
import getInstanceByImageId from './getInstanceByImageId';
import { setShowPercentage } from './PleuraBlinePercentage';
import buildLUSToolState from './sr/buildLUSToolState';
import hydrateLUSAnnotationsFromSR from './sr/hydrateLUSAnnotationsFromSR';

const { MeasurementReport } = adaptersSR.Cornerstone3D;

const { downloadBlob } = utils;

const { transformWorldToIndex } = utilities;

/**
 * Creates and returns the commands module for ultrasound annotation
 * @param params - Extension parameters including servicesManager and commandsManager
 * @returns The commands module with actions and definitions
 */
function commandsModule({
  servicesManager,
  commandsManager,
  extensionManager,
}: OhifTypes.Extensions.ExtensionParams): OhifTypes.Extensions.CommandsModule {
  const { viewportGridService, toolGroupService, cornerstoneViewportService, uiNotificationService } =
    servicesManager.services as AppTypes.Services;

  const actions = {
    /**
     * Switches the active ultrasound annotation type
     * @param options - Object containing the annotationType to switch to
     */
    switchUSPleuraBLineAnnotation: ({ annotationType }) => {
      const activeViewportId = viewportGridService.getActiveViewportId();
      const toolGroup = toolGroupService.getToolGroupForViewport(activeViewportId);
      if (!toolGroup) {
        return;
      }
      const usAnnotation = toolGroup.getToolInstance(UltrasoundPleuraBLineTool.toolName);
      if (usAnnotation) {
        usAnnotation.setActiveAnnotationType(annotationType);
      }
    },
    /**
     * Convenience method to switch to pleura line annotation type
     */
    switchUSPleuraBLineAnnotationToPleuraLine: () => {
      actions.switchUSPleuraBLineAnnotation({
        annotationType: UltrasoundPleuraBLineTool.USPleuraBLineAnnotationType.PLEURA,
      });
    },
    /**
     * Convenience method to switch to B-line annotation type
     */
    switchUSPleuraBLineAnnotationToBLine: () => {
      actions.switchUSPleuraBLineAnnotation({
        annotationType: UltrasoundPleuraBLineTool.USPleuraBLineAnnotationType.BLINE,
      });
    },
    /**
     * Deletes the last annotation of the specified type
     * @param options - Object containing the annotationType to delete
     */
    deleteLastUSPleuraBLineAnnotation: ({ annotationType }) => {
      const activeViewportId = viewportGridService.getActiveViewportId();
      const toolGroup = toolGroupService.getToolGroupForViewport(activeViewportId);
      if (!toolGroup) {
        return;
      }
      const usAnnotation = toolGroup.getToolInstance(UltrasoundPleuraBLineTool.toolName);
      if (usAnnotation) {
        const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);
        usAnnotation.deleteLastAnnotationType(viewport.element, annotationType);
        viewport.render();
      }
    },

    /**
     * Convenience method to delete the last pleura line annotation
     */
    deleteLastPleuraAnnotation: () => {
      actions.deleteLastUSPleuraBLineAnnotation({
        annotationType: UltrasoundPleuraBLineTool.USPleuraBLineAnnotationType.PLEURA,
      });
    },
    /**
     * Convenience method to delete the last B-line annotation
     */
    deleteLastBLineAnnotation: () => {
      actions.deleteLastUSPleuraBLineAnnotation({
        annotationType: UltrasoundPleuraBLineTool.USPleuraBLineAnnotationType.BLINE,
      });
    },
    /**
     * Toggles a boolean attribute of the ultrasound annotation tool
     * @param options - Object containing the attribute name to toggle
     */
    toggleUSToolAttribute: ({ attribute }) => {
      const activeViewportId = viewportGridService.getActiveViewportId();
      const toolGroup = toolGroupService.getToolGroupForViewport(activeViewportId);
      if (!toolGroup) {
        return;
      }
      const configuration = toolGroup.getToolConfiguration(UltrasoundPleuraBLineTool.toolName);
      if (!configuration) {
        return;
      }
      toolGroup.setToolConfiguration(UltrasoundPleuraBLineTool.toolName, {
        [attribute]: !configuration[attribute],
      });
      const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);
      viewport.render();
    },
    /**
     * Sets a specific attribute of the ultrasound annotation tool to a given value
     * @param options - Object containing the attribute name and value to set
     */
    setUSToolAttribute: ({ attribute, value }) => {
      const activeViewportId = viewportGridService.getActiveViewportId();
      const toolGroup = toolGroupService.getToolGroupForViewport(activeViewportId);
      if (!toolGroup) {
        return;
      }
      const configuration = toolGroup.getToolConfiguration(UltrasoundPleuraBLineTool.toolName);
      if (!configuration) {
        return;
      }
      toolGroup.setToolConfiguration(UltrasoundPleuraBLineTool.toolName, {
        [attribute]: value,
      });
      const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);
      viewport.render();
    },
    /**
     * Toggles the display of fan annotations
     */
    toggleDisplayFanAnnotation: () => {
      actions.toggleUSToolAttribute({
        attribute: 'showFanAnnotations',
      });
    },
    /**
     * Toggles the display of the depth guide
     */
    toggleDepthGuide: () => {
      actions.toggleUSToolAttribute({
        attribute: 'drawDepthGuide',
      });
    },
    /**
     * Sets the depth guide display state
     * @param options - Object containing the boolean value to set
     */
    setDepthGuide: ({ value }) => {
      actions.setUSToolAttribute({
        attribute: 'drawDepthGuide',
        value,
      });
    },
    /**
     * Sets the fan annotation display state
     * @param options - Object containing the boolean value to set
     */
    setDisplayFanAnnotation: ({ value }) => {
      actions.setUSToolAttribute({
        attribute: 'showFanAnnotations',
        value,
      });
    },
    /**
     * Sets whether to show the pleura percentage in the viewport overlay
     * @param options - Object containing the boolean value to set
     */
    setShowPleuraPercentage: ({ value }) => {
      setShowPercentage(value);
      // Trigger ANNOTATION_MODIFIED event to update the overlay
      triggerEvent(eventTarget, csToolsEnums.Events.ANNOTATION_MODIFIED, {
        annotation: {
          metadata: {
            toolName: UltrasoundPleuraBLineTool.toolName,
          },
        },
      });
    },
    /**
     * Generates a JSON representation of the ultrasound annotations
     * @param labels - Array of annotation labels
     * @param imageIds - Array of image IDs to include in the JSON
     * @returns A JSON object containing the annotations data or undefined if generation fails
     */
    generateUSPleuraBLineAnnotationsJSON: (labels: string[] = [], imageIds: string[] = []) => {
      const activeViewportId = viewportGridService.getActiveViewportId();
      const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);
      if (!viewport) {
        return;
      }
      const { imageData } = viewport.getImageData() || {};
      if (!imageData) {
        return;
      }

      const toolGroup = toolGroupService.getToolGroupForViewport(activeViewportId);
      if (!toolGroup) {
        return;
      }
      const usAnnotation = toolGroup.getToolInstance(UltrasoundPleuraBLineTool.toolName);
      if (usAnnotation) {
        const configuration = toolGroup.getToolConfiguration(UltrasoundPleuraBLineTool.toolName);
        const imageId = viewport.getCurrentImageId();
        const filterImageIds = (imageId: string) => {
          if (imageIds.length === 0) {
            return true;
          } else {
            return imageIds.includes(imageId);
          }
        };
        const annotations = UltrasoundPleuraBLineTool.filterAnnotations(
          viewport.element,
          filterImageIds
        );
        const frame_annotations = {};
        const viewportImageIds = viewport.getImageIds();
        annotations.forEach(annotation => {
          const imageId = annotation.metadata.referencedImageId;
          const { annotationType } = annotation.data;
          const [point1, point2] = annotation.data.handles.points;
          const p1 = transformWorldToIndex(imageData, point1);
          const p2 = transformWorldToIndex(imageData, point2);
          const imageIdIndex = viewportImageIds.indexOf(imageId);
          if (frame_annotations[imageIdIndex] === undefined) {
            frame_annotations[imageIdIndex] = {
              pleura_lines: [],
              b_lines: [],
            };
          }
          if (annotationType === UltrasoundPleuraBLineTool.USPleuraBLineAnnotationType.PLEURA) {
            frame_annotations[imageIdIndex].pleura_lines.push([
              [p1[0], p1[1], 0],
              [p2[0], p2[1], 0],
            ]);
          } else if (
            annotationType === UltrasoundPleuraBLineTool.USPleuraBLineAnnotationType.BLINE
          ) {
            frame_annotations[imageIdIndex].b_lines.push([
              [p1[0], p1[1], 0],
              [p2[0], p2[1], 0],
            ]);
          }
        });

        const instance = getInstanceByImageId(servicesManager.services, imageId);
        const json = {
          SOPInstanceUID: instance.SOPInstanceUID,
          GrayscaleConversion: false,
          mask_type: 'fan',
          angle1: configuration.startAngle,
          angle2: configuration.endAngle,
          center_rows_px: configuration.center[0],
          center_cols_px: configuration.center[1],
          radius1: configuration.innerRadius,
          radius2: configuration.outerRadius,
          image_size_rows: instance.rows,
          image_size_cols: instance.columns,
          AnnotationLabels: labels,
          frame_annotations,
        };
        return json;
      }
    },
    /**
     * Downloads the ultrasound annotations as a JSON file
     * @param options - Object containing labels and imageIds arrays
     */
    downloadUSPleuraBLineAnnotationsJSON({ labels = [], imageIds = [] }) {
      const json = actions.generateUSPleuraBLineAnnotationsJSON(labels, imageIds);
      if (!json) {
        return;
      }

      // Convert JSON object to a string
      const jsonString = JSON.stringify(json, null, 2);

      // Create a blob with the JSON data
      const blob = new Blob([jsonString], { type: 'application/json' });
      downloadBlob(blob, {
        filename: `ultrasound_annotations_${new Date().toISOString().slice(0, 10)}.json`,
      });
    },
    /**
     * Saves pleura and B-line annotations as a DICOM SR to the active data source.
     */
    /**
     * Loads pleura/B-line annotations from a DICOM SR into the ultrasound tool
     * on the US viewport (same representation as manual annotation).
     */
    loadLUSAnnotationsFromSR: async ({ displaySetInstanceUID, replaceExisting = true } = {}) => {
      try {
        const result = await hydrateLUSAnnotationsFromSR({
          servicesManager,
          extensionManager,
          displaySetInstanceUID,
          replaceExisting,
        });

        if (result.errors.length && result.added === 0) {
          uiNotificationService.show({
            title: 'Load SR',
            message: result.errors[0],
            type: 'error',
          });
          return result;
        }

        const skippedText = result.skipped ? ` (${result.skipped} skipped)` : '';
        uiNotificationService.show({
          title: 'Load SR',
          message: `Loaded ${result.added} annotation${result.added === 1 ? '' : 's'}${skippedText}`,
          type: result.added > 0 ? 'success' : 'info',
        });

        return result;
      } catch (error) {
        uiNotificationService.show({
          title: 'Load SR',
          message: error.message || 'Failed to load structured report',
          type: 'error',
        });
      }
    },
    saveLUSReportToDatastore: async ({ imageIds = [] }) => {
      const activeViewportId = viewportGridService.getActiveViewportId();
      const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);

      if (!viewport) {
        uiNotificationService.show({
          title: 'Save SR',
          message: 'No active viewport',
          type: 'error',
        });
        return;
      }

      const filterImageIds = (imageId: string) => {
        if (imageIds.length === 0) {
          return true;
        }
        return imageIds.includes(imageId);
      };

      const toolState = buildLUSToolState(viewport, filterImageIds);

      if (!toolState) {
        uiNotificationService.show({
          title: 'Save SR',
          message: 'No annotations to save',
          type: 'error',
        });
        return;
      }

      const activeDataSource = extensionManager.getActiveDataSource()?.[0];
      const dataSourceName = activeDataSource?.sourceName || 'dicomweb';

      const storeFn = commandsManager.runCommand('createStoreFunction', {
        dataSource: dataSourceName,
        defaultFileName: 'lus-annotations-sr.dcm',
      });

      if (!storeFn) {
        uiNotificationService.show({
          title: 'Save SR',
          message: 'DICOM store is not configured for the active data source',
          type: 'error',
        });
        return;
      }

      try {
        const naturalizedReport = MeasurementReport.generateReport(toolState, metaData, {
          SeriesDescription: 'LUS Pleura B-line Annotations',
        });

        const { ContentSequence } = naturalizedReport;
        if (!ContentSequence?.[4]?.ContentSequence?.length) {
          throw new Error('Invalid report, no content');
        }

        await storeFn(naturalizedReport);

        uiNotificationService.show({
          title: 'Save SR',
          message: 'Structured report saved successfully',
          type: 'success',
        });
      } catch (error) {
        uiNotificationService.show({
          title: 'Save SR',
          message: error.message || 'Failed to save structured report',
          type: 'error',
        });
      }
    },
  };

  const definitions = {
    switchUSAnnotation: {
      commandFn: actions.switchUSPleuraBLineAnnotation,
    },
    deleteLastAnnotation: {
      commandFn: actions.deleteLastUSPleuraBLineAnnotation,
    },
    toggleDepthGuide: {
      commandFn: actions.toggleDepthGuide,
    },
    setDepthGuide: {
      commandFn: actions.setDepthGuide,
    },
    setShowPleuraPercentage: {
      commandFn: actions.setShowPleuraPercentage,
    },
    toggleUSToolAttribute: {
      commandFn: actions.toggleUSToolAttribute,
    },
    setUSToolAttribute: {
      commandFn: actions.setUSToolAttribute,
    },
    toggleDisplayFanAnnotation: {
      commandFn: actions.toggleDisplayFanAnnotation,
    },
    setDisplayFanAnnotation: {
      commandFn: actions.setDisplayFanAnnotation,
    },
    generateJSON: {
      commandFn: actions.generateUSPleuraBLineAnnotationsJSON,
    },
    downloadJSON: {
      commandFn: actions.downloadUSPleuraBLineAnnotationsJSON,
    },
    saveLUSReportToDatastore: {
      commandFn: actions.saveLUSReportToDatastore,
    },
    loadLUSAnnotationsFromSR: {
      commandFn: actions.loadLUSAnnotationsFromSR,
    },
    switchUSAnnotationToPleuraLine: {
      commandFn: actions.switchUSPleuraBLineAnnotationToPleuraLine,
    },
    switchUSAnnotationToBLine: {
      commandFn: actions.switchUSPleuraBLineAnnotationToBLine,
    },
    deleteLastPleuraAnnotation: {
      commandFn: actions.deleteLastPleuraAnnotation,
    },
    deleteLastBLineAnnotation: {
      commandFn: actions.deleteLastBLineAnnotation,
    },
  };

  return {
    actions,
    definitions,
    defaultContext: 'CORNERSTONE',
  };
}

export default commandsModule;
