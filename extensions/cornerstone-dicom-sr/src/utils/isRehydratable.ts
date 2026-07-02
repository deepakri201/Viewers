import { adaptersSR } from '@cornerstonejs/adapters';

const { MeasurementReport } = adaptersSR.Cornerstone3D;

/**
 * Checks if the given `displaySet`can be rehydrated into the `measurementService`.
 *
 * @param {object} displaySet The SR `displaySet` to check.
 * @param {object[]} mappings The CornerstoneTools 4 mappings to the `measurementService`.
 * @returns {boolean} True if the SR can be rehydrated into the `measurementService`.
 */
export default function isRehydratable(displaySet, mappings) {
  if (!mappings || !mappings.length) {
    return false;
  }

  const mappingDefinitions = new Set<string>();
  for (const m of mappings) {
    mappingDefinitions.add(m.annotationType);
  }

  const { measurements } = displaySet;

  for (let i = 0; i < measurements.length; i++) {
    const measurement = measurements[i];
    if (!measurement) {
      continue;
    }
    const { TrackingIdentifier = '', graphicType, graphicCode, pointsLength } = measurement;
    if (!TrackingIdentifier && !graphicType) {
      console.warn('No tracking identifier  or graphicType for measurement ', measurement);
      continue;
    }
    const adapter = MeasurementReport.getAdapterForTrackingIdentifier(TrackingIdentifier);

    const coord = measurement.coords?.[0];
    const resolvedGraphicType = graphicType || coord?.GraphicType;
    const resolvedPointsLength =
      pointsLength ||
      (coord?.GraphicData
        ? coord.GraphicData.length / (coord.ValueType === 'SCOORD3D' ? 3 : 2)
        : undefined);

    const adapters = MeasurementReport.getAdaptersForTypes(
      graphicCode,
      resolvedGraphicType,
      resolvedPointsLength
    );
    const hydratable =
      (adapter && mappingDefinitions.has(adapter.toolType)) ||
      (adapters && adapters.some(a => mappingDefinitions.has(a.toolType)));

    if (hydratable) {
      return true;
    }
    console.log('Measurement is not rehydratable', TrackingIdentifier, measurements[i]);
  }

  console.log('No measurements found which were rehydratable');
  return false;
}
