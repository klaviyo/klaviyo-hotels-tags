___INFO___

{
  "type": "TAG",
  "id": "cvt_temp_public_id",
  "version": 1,
  "securityGroups": [],
  "displayName": "Cloudbeds Tag",
  "brand": {
    "id": "brand_dummy",
    "displayName": ""
  },
  "description": "Event tracking for Cloudbeds",
  "containerContexts": [
    "WEB"
  ]
}


___TEMPLATE_PARAMETERS___

[
  {
    "type": "TEXT",
    "name": "account_id",
    "displayName": "Klaviyo Public API Key",
    "simpleValueType": true
  }
]


___SANDBOXED_JS_FOR_WEB_TEMPLATE___

const injectScript = require('injectScript');
const encodeUriComponent = require('encodeUriComponent');

function initialiseKlaviyoTracking(){
  injectScript('https://frantisekfr.github.io/klaviyo/klaviyo_ga_tracking.js',data.gtmOnSuccess,data.gtmOnFailure);
}

function loadKlaviyoJS(){
  injectScript('https://static.klaviyo.com/onsite/js/' + encodeUriComponent(data.account_id) + '/klaviyo.js', initialiseKlaviyoTracking); 
}

loadKlaviyoJS();


___WEB_PERMISSIONS___

[
  {
    "instance": {
      "key": {
        "publicId": "inject_script",
        "versionId": "1"
      },
      "param": [
        {
          "key": "urls",
          "value": {
            "type": 2,
            "listItem": [
              {
                "type": 1,
                "string": "https://static.klaviyo.com/*"
              }
            ]
          }
        }
      ]
    },
    "clientAnnotations": {
      "isEditedByUser": true
    },
    "isRequired": true
  }
]


___TESTS___

scenarios: []


___NOTES___

Created on 1/29/2026, 10:41:58 PM


