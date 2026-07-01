/** @type {AppTypes.Config} */
window.config = {
  routerBasename: '/',
  enableGoogleCloudAdapter: false,
  showWarningMessageForCrossOrigin: true,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,
  groupEnabledModesFirst: true,
  showStudyList: true,
  extensions: [],
  modes: [],
  defaultDataSourceName: 'dicomweb',
  modesConfiguration: {
    '@ohif/mode-ultrasound-pleura-bline': {
      hide: { $set: false },
      displayName: { $set: 'US Pleura B-line Annotations' },
    },
    '@ohif/mode-longitudinal': {
      hide: { $set: true },
    },
    '@ohif/mode-basic': {
      hide: { $set: true },
    },
    '@ohif/mode-segmentation': {
      hide: { $set: true },
    },
    '@ohif/mode-tmtv': {
      hide: { $set: true },
    },
    '@ohif/mode-microscopy': {
      hide: { $set: true },
    },
    '@ohif/mode-preclinical-4d': {
      hide: { $set: true },
    },
  },
  oidc: [
    {
      authority: 'https://accounts.google.com',
      client_id: '907949205650-opnnsmrbijf05jcs3m01ldb3mt38dje2.apps.googleusercontent.com',
      redirect_uri: '/callback',
      response_type: 'id_token token',
      scope:
        'email profile openid https://www.googleapis.com/auth/cloudplatformprojects.readonly https://www.googleapis.com/auth/cloud-healthcare',
      post_logout_redirect_uri: '/logout-redirect.html',
      revoke_uri: 'https://accounts.google.com/o/oauth2/revoke?token=',
      automaticSilentRenew: true,
      revokeAccessTokenOnSignout: true,
    },
  ],
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'dcmjs DICOMWeb Server',
        name: 'GCP',
        wadoUriRoot:
          'https://healthcare.googleapis.com/v1/projects/bwh-bwh-pocus-dev-1772056802/locations/us-central1/datasets/deepa_ohif/dicomStores/dicom/dicomWeb',
        qidoRoot:
          'https://healthcare.googleapis.com/v1/projects/bwh-bwh-pocus-dev-1772056802/locations/us-central1/datasets/deepa_ohif/dicomStores/dicom/dicomWeb',
        wadoRoot:
          'https://healthcare.googleapis.com/v1/projects/bwh-bwh-pocus-dev-1772056802/locations/us-central1/datasets/deepa_ohif/dicomStores/dicom/dicomWeb',
        qidoSupportsIncludeField: true,
        imageRendering: 'wadors',
        thumbnailRendering: 'rendered',
        thumbnailRequestStrategy: 'fetch',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: true,
        supportsWildcard: false,
        dicomUploadEnabled: true,
        supportsStow: true,
        omitQuotationForMultipartRequest: true,
        configurationAPI: 'ohif.dataSourceConfigurationAPI.google',
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: {
        friendlyName: 'dicom json',
        name: 'json',
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal',
      sourceName: 'dicomlocal',
      configuration: {
        friendlyName: 'dicom local',
      },
    },
  ],
};
