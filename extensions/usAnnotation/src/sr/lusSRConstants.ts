export const LUS_SR_FINDING_SITES = {
  PLEURA: {
    CodeValue: '3120008',
    CodingSchemeDesignator: 'SCT',
    CodeMeaning: 'Pleura',
  },
  BLINE: {
    CodeValue: '1217292008',
    CodingSchemeDesignator: 'SCT',
    CodeMeaning: 'Lung B-lines',
  },
} as const;

export const LUS_SR_TOOL_TYPES = {
  PLEURA: 'LUSPleuraLine',
  BLINE: 'LUSBLine',
} as const;

export const LUS_SR_CODING_VALUES = {
  'SCT:3120008': {
    text: 'Pleura',
    type: 'findingSite',
  },
  'SCT:1217292008': {
    text: 'Lung B-lines',
    type: 'findingSite',
  },
};
