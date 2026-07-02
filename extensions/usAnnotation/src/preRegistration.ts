import registerSRAdapters from './sr/registerSRAdapters';
import registerLUSMeasurementMappings from './sr/registerLUSMeasurementMappings';

export default function preRegistration({ servicesManager }: withAppTypes) {
  registerSRAdapters();
  registerLUSMeasurementMappings({ servicesManager });
}
