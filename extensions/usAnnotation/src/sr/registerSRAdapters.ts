import { utilities as dcmjsUtilities } from 'dcmjs';
import { utilities as csUtilities } from '@cornerstonejs/core';
import { adaptersSR } from '@cornerstonejs/adapters';
import TID300Width from './TID300Width';
import { LUS_SR_TOOL_TYPES } from './lusSRConstants';

const { MeasurementReport, BaseAdapter3D } = adaptersSR.Cornerstone3D;
const TID300Length = dcmjsUtilities.TID300.Length;
const { worldToImageCoords } = csUtilities;

function createLUSLineAdapter(toolType: string, TID300Representation: typeof TID300Length) {
  class LUSLineAdapter extends BaseAdapter3D {
    static getMeasurementData(measurementGroup, sopInstanceUIDToImageIdMap, metadata) {
      const { state, NUMGroup, worldCoords, referencedImageId, ReferencedFrameNumber } =
        MeasurementReport.getSetupMeasurementData(
          measurementGroup,
          sopInstanceUIDToImageIdMap,
          metadata,
          this.toolType
        );

      const cachedStats = referencedImageId
        ? {
            [`imageId:${referencedImageId}`]: {
              length: NUMGroup ? NUMGroup.MeasuredValueSequence.NumericValue : 0,
              unit: NUMGroup?.MeasuredValueSequence?.MeasurementUnitsCodeSequence?.CodeValue,
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
    }

    static getTID300RepresentationArguments(tool, is3DMeasurement) {
      const { data, finding, findingSites, metadata } = tool;
      const { handles } = data;
      const referencedImageId = metadata.referencedImageId;

      if (!referencedImageId) {
        throw new Error(`${toolType}: referencedImageId is not defined`);
      }

      const start = worldToImageCoords(referencedImageId, handles.points[0]);
      const end = worldToImageCoords(referencedImageId, handles.points[1]);

      return {
        point1: { x: start[0], y: start[1] },
        point2: { x: end[0], y: end[1] },
        trackingIdentifierTextValue: this.trackingIdentifierTextValue,
        finding,
        findingSites: findingSites || [],
      };
    }
  }

  LUSLineAdapter.init(toolType, TID300Representation);
  return LUSLineAdapter;
}

let registered = false;

export default function registerSRAdapters() {
  if (registered) {
    return;
  }

  createLUSLineAdapter(LUS_SR_TOOL_TYPES.PLEURA, TID300Length);
  createLUSLineAdapter(LUS_SR_TOOL_TYPES.BLINE, TID300Width);

  registered = true;
}
