import { LUS_SR_TOOL_TYPES } from './lusSRConstants';

/**
 * Remaps LUS-specific SR adapter types to Length so hydration uses the standard
 * OHIF Length tool path (pixel SCOORD → world via adapters, rendered on the US viewport).
 */
export function remapLUSMeasurementsToLength({
  storedMeasurementByAnnotationType,
}: {
  storedMeasurementByAnnotationType: Record<string, unknown[]>;
}) {
  const result = { ...storedMeasurementByAnnotationType };
  const lusTypes = [LUS_SR_TOOL_TYPES.PLEURA, LUS_SR_TOOL_TYPES.BLINE];

  let lengthMeasurements = [...(result.Length || [])];

  for (const lusType of lusTypes) {
    const measurements = result[lusType];
    if (measurements?.length) {
      lengthMeasurements = lengthMeasurements.concat(measurements);
      delete result[lusType];
    }
  }

  if (lengthMeasurements.length) {
    result.Length = lengthMeasurements;
  }

  return result;
}
