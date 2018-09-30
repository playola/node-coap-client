/*
* Node CoAP Client
* CoAP Client that observe a sensor and sends its value to a platform.
* The platform thethings.io needs a TOKEN_ID to post data into their database.
*
* Default port 5638. Default action 'GET'
*/

//WATSON IBM Use sctrict mode
'use strict';

var coap = require('coap'),
    server = coap.createServer({ type: 'udp6' }),
    ip = require('ip'),
    request = require('request'),
    secrets = require('../server/secrets.js');

// WATSON IBM packages and libraries
var express = require('express'),
    Iotf = require('ibmiotf'), // The ibmiotf package simplifies intractions with the IoT Foundation Service
    cfenv = require('cfenv'); // The cfenv module helps to access the Cloud Foundry environment

//------------------------------------------------------------------------------
//WATSON IBM Change variable values in this section to customize emitted data
//------------------------------------------------------------------------------

//
//WATSON IBM Name of the MQTT topic that the data should be published on
var topicToBePublishedOn = 'myTopic';

// WATSON IBM Wait this many seconds before publishing the next set of data
var varIntervalBetweenData = 2;

// WATSON IBM Quality of Serive for the publish event. Supported values : 0, 1, 2
var QosLevel = 0;

// read the id of the IoT foundation org out of a local .env file
// format of .env file:
// iotf_org=<id of IoT Foundation organization>
require('dotenv').load();

// WATSON IBM Note that the following configuration must match with the parameters that
// the device-simulator was registered with. This device registration can
// either be done in the dashboard of the IoT Foundation service or via its
// API

var iotfConfig = {
    "org" : process.env.iotf_org,
    "id" : process.env.iotf_id,
    "auth-token" : process.env.iotf_authtoken,
    "type" : process.env.iotf_type,
    "auth-method" : "token"
};

//------------------------------------------------------------------------------
// Setup all the required node modules we'll need
//------------------------------------------------------------------------------

// WATSON IBM Initialize the app as an express application
var app = express();

//WATSON IBM  get the application environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

console.log('');
console.log('--- DEBUG appENV: ---');
console.log(appEnv);
console.log('');

//WATSON IBM ---Start the express server---------------------------------------------------

 app.listen(appEnv.port, function() {
     console.log("Server started on " + appEnv.url);
  }).on('error', function(err) {
    if (err.errno === 'EADDRINUSE') {
        console.log('Server not started, port ' + appEnv.url + ' is busy');
    } else {
        console.log(err);
    }
});

//WATSON IBM ---Connect to the IoT Foundation service--------------------------------------

console.log('');
console.log('--- DEBUG iotConfig: ---');
console.log(iotfConfig);
console.log('');

//WATSON IBM  Create a client (used to send data)
var iotfClient = new Iotf.IotfDevice(iotfConfig);

//WATSON IBM  Connect to the initialized iotf service
iotfClient.connect();

//WATSON IBM  Handle errors coming from the iotf service
iotfClient.on('error', function (err) {
    if (err.message.indexOf('authorized') > -1) {
        console.log('');
        console.log('Make sure the device-simulator is registered in the IotF org with the following configuration:')
        console.log(iotfConfig);
        console.log('');
    }
    process.exit( );
});

server.on('request', function(req, res) {
  res.end('Starting CoAP Client\n')
});

server.listen(function() {
  console.log('----- CoAP Client initialized -----');
  var previousValue = '1';
  coap
    .request({
      host: secrets.getSecret('coapHost'),
      pathname: '/sensors/pressure',
      observe: true,
      method: 'GET'
    })
    .on('response', function(res) {
      if (res.code !== '2.05') return process.exit(1);

      res.on('data', function(src) {
        var value = src.toString();
        if(value !== previousValue) {
          updateDatabase(value);
        }
        previousValue = value;
      });
    })
    .end()
});

function updateDatabase(value) {
  // Sava data in MongoDB
  postPressureIntoDatabase(value);

  // Save data in Watson
  //postPressureIntoPlatform(value);

  // Controller of an external Z-Wave light
  zwaveController(value);
};

/**
* Save pressure value into MongoDB database.
*/
function postPressureIntoDatabase(value) {
  var port = 8000;
  var myIp = 'http://' + ip.address() + ':' + port;
  console.log('posting on IP: ', myIp);
  console.log('Update database', value);
  request.post({
    headers: { 'content-type': 'application/json' },
    url: myIp + '/',
    body: value
  }, function(error, response, body){
    console.log(body);
  });
};

/**
* Save pressure value into platform database.
*/
function postPressureIntoPlatform(value) {
  var payload = {
    id: 666,
    room: 6,
    pressure: Number(value),
    timestamp: new Date(),
  };

  console.log('Device simulator is connected to the IoT Foundation service');
  console.log('QoS level set to: ' + QosLevel);

  iotfClient.publish('DS_status', 'json', JSON.stringify(payload) );
  // Log out the emitted dataPacket
  console.log(JSON.stringify(payload));
};

/**
* Controller that turns on and off a Z-Wave light.
*/
function zwaveController(value) {
  console.log('----- Connecting to Z-Wave light -----');
  var lightStatus = 0;
  if(value === '0') {
    lightStatus = 255;
  }
  var loginPayload = {
    form: true,
    login: secrets.getSecret('zwaveAdmin'),
    password: secrets.getSecret('zwavePassword'),
    keepme: false,
  };
  request.post({
    headers: { 'content-type': 'application/json' },
    url: 'http://'
    + secrets.getSecret('zwaveHost')
    + '/ZAutomation/api/v1/login',
    body: JSON.stringify(loginPayload)
  }, function(error, response, body){
    console.log('Login successfull!');
    var parsedBody = JSON.parse(body);
    var zwaveCookie = parsedBody.data.sid;
    var zwaveCookieString = 'ZWAYSession=' + zwaveCookie;
    request.post({
      headers: {
        'content-type': 'application/json',
        'Cookie': zwaveCookieString,
      },
      url: 'http://'
      + secrets.getSecret('zwaveHost')
      + '/ZWaveAPI/Run/devices[3].instances[0].commandClasses[32].Set(' + lightStatus + ')'
    }, function(error, response, body){
      console.log('Light changed successfull!');
    });
  });
}
