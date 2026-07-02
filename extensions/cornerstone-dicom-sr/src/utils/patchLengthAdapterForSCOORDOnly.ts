import { adaptersSR } from '@cornerstonejs/adapters';

const { MeasurementReport } = adaptersSR.Cornerstone3D;

let patched = false;

/**
 * External LUS SRs (e.g. create_LUS_SR) often encode pleura/B-line geometry as
 * SCOORD POLYLINE without a NUM / MeasuredValueSequence. The stock Length adapter
 * assumes NUMGroup.MeasuredValueSequence exists whenever NUMGroup is truthy, but
 * getSetupMeasurementData synthesizes a NUMGroup-like object from SCOORD items when
 * no NUM is present — causing "Cannot read properties of undefined (reading 'NumericValue')".
 */
export default function patchLengthAdapterForSCOORDOnly() {
  if (patched) {
    return;
  }

  const lengthAdapter = MeasurementReport.measurementAdapterByToolType.get('Length');

  if (!lengthAdapter?.getMeasurementData) {
    return;
  }

  const originalGetMeasurementData = lengthAdapter.getMeasurementData.bind(lengthAdapter);

  lengthAdapter.getMeasurementData = function getMeasurementData(
    MeasurementGroup,
    sopInstanceUIDToImageIdMap,
    metadata
  ) {
    const result = MeasurementReport.getSetupMeasurementData(
      MeasurementGroup,
      sopInstanceUIDToImageIdMap,
      metadata,
      this.toolType
    );

    const { state, NUMGroup, worldCoords, referencedImageId, ReferencedFrameNumber } = result;

    const numericValue = NUMGroup?.MeasuredValueSequence?.NumericValue ?? 0;
    const unit = NUMGroup?.MeasuredValueSequence?.MeasurementUnitsCodeSequence?.CodeValue;

    const cachedStats = referencedImageId
      ? {
          [`imageId:${referencedImageId}`]: {
            length: numericValue,
            unit,
          },
        }
      : {};

    state.annotation.data = {
      ...state.annotation.data,
      handles: {
        ...state.annotation.data.handles,
        points: [worldCoords[0], worldCoords[1]],
        activeHandleIndex: 0,
      },
      cachedStats,
      frameNumber: ReferencedFrameNumber,
    };

    return state;
  };

  patched = true;
}
