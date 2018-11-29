/**
 * config sample file
 * use `cp config.sample.js config.js` to create a config
 *
 */
module.exports = {

  //// dev related

  // local dev server port
  // devPort: 8020,

  // build process count
  // devCPUCount: os.cpus().length,

  //// build options

  // minimize content.js
  // minimize: false

  // congfigs to build app

  //// ringcentral config

  ringCentralConfigs: {
    // your ringCentral app's Client ID
    // appKey: 'qypdfgCMRJuSOOivhrrGVeCrw',

    // your ringCentral app's Auth Server URL
    // appServer: 'https://platform.devtest.ringcentral.com'
  },


  //// for third party related
  thirdPartyConfigs: {

    //service name, one word only, such as Insightly, RedTailCRM...
    serviceName: 'RedtailCRM',

    //show call log sync form or not
    showCallLogSyncForm: true
  }


}



