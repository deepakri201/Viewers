import { UltrasoundPleuraBLineTool } from '@cornerstonejs/tools';
import type { Types } from '@cornerstonejs/core';
import { LUS_SR_FINDING_SITES, LUS_SR_TOOL_TYPES } from './lusSRConstants';

type FilterImageIds = (imageId: string) => boolean;

export default function buildLUSToolState(
  viewport: Types.IStackViewport | Types.IVolumeViewport,
  filterImageIds: FilterImageIds = () => true
) {
  const annotations = UltrasoundPleuraBLineTool.filterAnnotations(viewport.element, filterImageIds);

  if (!annotations.length) {
    return null;
  }

  const pleuraData = [];
  const blineData = [];

  annotations.forEach(annotation => {
    const { annotationType } = annotation.data;
    const isPleura =
      annotationType === UltrasoundPleuraBLineTool.USPleuraBLineAnnotationType.PLEURA;

    const findingSites = [isPleura ? LUS_SR_FINDING_SITES.PLEURA : LUS_SR_FINDING_SITES.BLINE];

    const enriched = {
      ...annotation,
      findingSites,
    };

    if (isPleura) {
      pleuraData.push(enriched);
    } else {
      blineData.push(enriched);
    }
  });

  const imageId = annotations[0].metadata.referencedImageId;
  const toolState = {
    [imageId]: {},
  };

  if (pleuraData.length) {
    toolState[imageId][LUS_SR_TOOL_TYPES.PLEURA] = { data: pleuraData };
  }

  if (blineData.length) {
    toolState[imageId][LUS_SR_TOOL_TYPES.BLINE] = { data: blineData };
  }

  return toolState;
}
