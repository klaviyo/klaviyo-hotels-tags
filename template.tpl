___TERMS_OF_SERVICE___

By creating or modifying this file you agree to Google Tag Manager's Community
Template Gallery Developer Terms of Service available at
https://developers.google.com/tag-manager/gallery-tos (or such other URL as
Google may provide), as modified from time to time.


___INFO___

{
  "type": "TAG",
  "id": "cvt_temp_public_id",
  "version": 1,
  "securityGroups": [],
  "displayName": "Klaviyo Hotel Template Tag",
  "categories": ["EMAIL_MARKETING", "ANALYTICS", "MARKETING"],
  "brand": {
    "id": "brand_dummy",
    "displayName": ""
  },
  "description": "Klaviyo Hotel Template for Mews, Cloudbeds, and Guesty",
  "containerContexts": [
    "WEB"
  ]
}


___TEMPLATE_PARAMETERS___

[
  {
    "type": "TEXT",
    "name": "account_id",
    "displayName": "Klaviyo public API key",
    "simpleValueType": true,
    "help": "You can find your public key using these instructions: https://help.klaviyo.com/hc/en-us/articles/115005062267#h_01HRFPP8R1AEVQ744SE33FQTEC",
    "valueValidators": [
      {
        "type": "STRING_LENGTH",
        "args": [
          6,
          6
        ]
      }
    ],
    "valueHint": "6 digit account ID",
    "notSetText": "Enter your Klaviyo public key"
  },
  {
    "type": "SELECT",
    "name": "hotel_type",
    "displayName": "Which hotel PMS (Property Management System) do you use?",
    "macrosInSelect": false,
    "selectItems": [
      {
        "value": "cloudbeds",
        "displayValue": "Cloudbeds"
      },
      {
        "value": "mews",
        "displayValue": "Mews"
      },
      {
        "value": "guesty",
        "displayValue": "Guesty"
      }
    ],
    "simpleValueType": true,
    "alwaysInSummary": true,
    "help": "Only customers using the booking engines for Mews, Guesty and Cloudbeds are supported today."
  }
]


___SANDBOXED_JS_FOR_WEB_TEMPLATE___

const injectScript = require('injectScript');
  const encodeUriComponent = require('encodeUriComponent');
  const log = require('logToConsole');

  function initialiseKlaviyoTracking(){
    log('Klaviyo JS loaded, now loading hotel tracking script');
    if (data.hotel_type == "cloudbeds"){
      injectScript(
        'https://klaviyo-hotel-cloudbeds.surge.sh/klaviyo_hotel_tracking_cloudbeds.js',
        function() {
          log('Cloudbeds tracking script loaded successfully');
          data.gtmOnSuccess();
        },
        function() {
          log('Hotel tracking script FAILED to load');
          data.gtmOnFailure();
        }
      );
    } else if (data.hotel_type == "mews"){
      injectScript(
        'https://klaviyo-hotel-mews.surge.sh/klaviyo_hotel_tracking_mews.js',
        function() {
          log('Mews tracking script loaded successfully');
          data.gtmOnSuccess();
        },
        function() {
          log('Hotel tracking script FAILED to load');
          data.gtmOnFailure();
        }
      );
    } else {
      injectScript(
        'https://klaviyo-hotel-guesty.surge.sh/klaviyo_hotel_tracking_guesty.js',
        function() {
          log('Guesty tracking script loaded successfully');
          data.gtmOnSuccess();
        },
        function() {
          log('Hotel tracking script FAILED to load');
          data.gtmOnFailure();
        }
      );
    }
  }

  function loadKlaviyoJS(){
    log('Loading Klaviyo JS');
    injectScript(
      'https://static.klaviyo.com/onsite/js/' + encodeUriComponent(data.account_id) + '/klaviyo.js',
      function() {
        log('Klaviyo JS success callback');
        initialiseKlaviyoTracking();
      },
      function() {
        log('Klaviyo JS FAILED callback');
        data.gtmOnFailure();
      }
    );
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
                "string": "https://static.klaviyo.com/onsite/js/*"
              },
              {
                "type": 1,
                "string": "https://klaviyo-hotel-cloudbeds.surge.sh/*"
              },
              {
                "type": 1,
                "string": "https://klaviyo-hotel-mews.surge.sh/*"
              },
              {
                "type": 1,
                "string": "https://klaviyo-hotel-guesty.surge.sh/*"
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
  },
  {
    "instance": {
      "key": {
        "publicId": "logging",
        "versionId": "1"
      },
      "param": [
        {
          "key": "environments",
          "value": {
            "type": 1,
            "string": "debug"
          }
        }
      ]
    },
    "isRequired": true
  }
]


___TESTS___

scenarios: []


___NOTES___

Created on 2/4/2026, 5:57:46 PM


