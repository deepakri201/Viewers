import { utilities as dcmjsUtilities } from 'dcmjs';

const TID300Length = dcmjsUtilities.TID300.Length;

/**
 * TID300 Width measurement (SNOMED 103355008) for lung ultrasound B-lines.
 * Extends Length geometry with a different concept code, matching create_LUS_SR.
 */
class TID300Width extends TID300Length {
  getConceptNameCodeSequence() {
    return {
      CodeValue: '103355008',
      CodingSchemeDesignator: 'SCT',
      CodeMeaning: 'Width',
    };
  }
}

export default TID300Width;
