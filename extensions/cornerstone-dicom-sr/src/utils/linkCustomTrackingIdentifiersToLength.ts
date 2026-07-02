import { adaptersSR } from '@cornerstonejs/adapters';

const { MeasurementReport } = adaptersSR.Cornerstone3D;

/**
 * SRs from external tools (e.g. create_LUS_SR) may use custom tracking identifiers
 * such as "pleura_f1_0" instead of Cornerstone3DTools@^0.1.0:Length.
 * Map unknown POLYLINE measurements to the Length adapter so hydration can proceed.
 */
export default function linkCustomTrackingIdentifiersToLength(measurements) {
  const lengthAdapter = MeasurementReport.measurementAdapterByToolType.get('Length');

  if (!lengthAdapter || !measurements?.length) {
    return;
  }

  for (const measurement of measurements) {
    const { TrackingIdentifier, coords } = measurement;

    if (!TrackingIdentifier || !coords?.length) {
      continue;
    }

    if (MeasurementReport.getAdapterForTrackingIdentifier(TrackingIdentifier)) {
      continue;
    }

    const coord = coords[0];
    if (coord?.GraphicType !== 'POLYLINE' || !coord?.GraphicData?.length) {
      continue;
    }

    MeasurementReport.registerTrackingIdentifier(lengthAdapter, TrackingIdentifier);
  }
}
