import { MeasurementService } from '@ohif/core';
import { Enums as CSExtensionEnums } from '@ohif/extension-cornerstone';
import Length from '@ohif/extension-cornerstone/src/utils/measurementServiceMappings/Length';
import { LUS_SR_TOOL_TYPES } from './lusSRConstants';

const { CORNERSTONE_3D_TOOLS_SOURCE_NAME, CORNERSTONE_3D_TOOLS_SOURCE_VERSION } =
  CSExtensionEnums;

const LUS_LENGTH_MATCHING_CRITERIA = [
  {
    valueType: MeasurementService.VALUE_TYPES.POLYLINE,
    points: 2,
  },
];

/**
 * Registers measurement-service mappings for LUS SR adapter tool types so
 * isRehydratable() succeeds. Hydration remaps these to Length before display.
 */
export default function registerLUSMeasurementMappings({
  servicesManager,
}: {
  servicesManager: AppTypes.ServicesManager;
}) {
  const { measurementService, displaySetService, cornerstoneViewportService, customizationService } =
    servicesManager.services;

  const source = measurementService.getSource(
    CORNERSTONE_3D_TOOLS_SOURCE_NAME,
    CORNERSTONE_3D_TOOLS_SOURCE_VERSION
  );

  if (!source) {
    return;
  }

  const toMeasurement = csToolsAnnotation =>
    Length.toMeasurement(
      csToolsAnnotation,
      displaySetService,
      cornerstoneViewportService,
      () => MeasurementService.VALUE_TYPES.POLYLINE,
      customizationService
    );

  for (const toolType of [LUS_SR_TOOL_TYPES.PLEURA, LUS_SR_TOOL_TYPES.BLINE]) {
    measurementService.addMapping(
      source,
      toolType,
      LUS_LENGTH_MATCHING_CRITERIA,
      Length.toAnnotation,
      toMeasurement
    );
  }
}
