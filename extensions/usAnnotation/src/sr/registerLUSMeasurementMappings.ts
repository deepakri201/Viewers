import { MeasurementService } from '@ohif/core';
import { Enums as CSExtensionEnums } from '@ohif/extension-cornerstone';
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
 * isRehydratable() succeeds. Hydration remaps these to Length (via
 * onBeforeSRHydration) before annotations are added, so these callbacks
 * are not used during SR load.
 */
export default function registerLUSMeasurementMappings({
  servicesManager,
}: {
  servicesManager: AppTypes.ServicesManager;
}) {
  const { measurementService } = servicesManager.services;

  const source = measurementService.getSource(
    CORNERSTONE_3D_TOOLS_SOURCE_NAME,
    CORNERSTONE_3D_TOOLS_SOURCE_VERSION
  );

  if (!source) {
    return;
  }

  const noopToAnnotation = () => null;
  const noopToMeasurement = () => null;

  for (const toolType of [LUS_SR_TOOL_TYPES.PLEURA, LUS_SR_TOOL_TYPES.BLINE]) {
    measurementService.addMapping(
      source,
      toolType,
      LUS_LENGTH_MATCHING_CRITERIA,
      noopToAnnotation,
      noopToMeasurement
    );
  }
}
