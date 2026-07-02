import { UltrasoundPleuraBLineTool } from '@cornerstonejs/tools';
import { LUS_SR_FINDING_SITES, LUS_SR_TOOL_TYPES } from './lusSRConstants';

const { PLEURA, BLINE } = UltrasoundPleuraBLineTool.USPleuraBLineAnnotationType;

/**
 * Classifies an SR measurement as pleura or B-line using finding sites,
 * tracking identifiers, or OHIF LUS adapter tool types.
 */
export default function classifyLUSMeasurementType(measurement): typeof PLEURA | typeof BLINE | null {
  for (const label of measurement.labels ?? []) {
    const value = String(label.value ?? '').toLowerCase();
    if (value.includes('pleura')) {
      return PLEURA;
    }
    if (value.includes('b-line') || value.includes('bline') || value.includes('lung b')) {
      return BLINE;
    }
  }

  const trackingId = String(measurement.TrackingIdentifier ?? '');
  const trackingLower = trackingId.toLowerCase();

  if (
    trackingId === LUS_SR_TOOL_TYPES.PLEURA ||
    trackingLower.includes('pleura') ||
    trackingLower.startsWith('pleura_')
  ) {
    return PLEURA;
  }

  if (
    trackingId === LUS_SR_TOOL_TYPES.BLINE ||
    trackingLower.includes('bline') ||
    trackingLower.includes('b_line') ||
    trackingLower.startsWith('bline_')
  ) {
    return BLINE;
  }

  const coord = measurement.coords?.[0];
  const concept = coord?.ConceptNameCodeSequence;
  if (concept?.CodeValue === LUS_SR_FINDING_SITES.PLEURA.CodeValue) {
    return PLEURA;
  }
  if (concept?.CodeValue === LUS_SR_FINDING_SITES.BLINE.CodeValue) {
    return BLINE;
  }

  return null;
}
