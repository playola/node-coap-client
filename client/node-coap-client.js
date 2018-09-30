/*
* Node CoAP Client
* CoAP Client that observe a sensor and sends its value to a database and a platform.
*/

'use strict'; // WATSON IBM Use sctrict mode

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
// WATSON IBM - Customize emitted data
//------------------------------------------------------------------------------
// Name of the MQTT topic that the data should be published on
var topicToBePublishedOn = 'myTopic';
// Wait this many seconds before publishing the next set of data
var varIntervalBetweenData = 2;
// Quality of Serive for the publish event. Supported values : 0, 1, 2
var QosLevel = 0;

// Read the id of the IoT foundation org out of a local .env file
// format of .env file: iotf_org=<id of IoT Foundation organization>
require('dotenv').load();

// WATSON IBM Device configuration
var iotfConfig = {
    'org' : process.env.iotf_org,
    'id' : process.env.iotf_id,
    'auth-token' : process.env.iotf_authtoken,
    'type' : process.env.iotf_type,
    'auth-method' : 'token'
};

//------------------------------------------------------------------------------
// WATSON IBM - Setup required node modules
//------------------------------------------------------------------------------
// Initialize the app as an express application
var app = express();

// Get the application environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// WATSON IBM - Express server
 app.listen(appEnv.port, function() {
     console.log('----- Server started on ' + appEnv.url + ' -----');
  }).on('error', function(err) {
    if (err.errno === 'EADDRINUSE') {
        console.log('***** Server not started, port ' + appEnv.url + ' is busy *****');
    } else {
        console.log(err);
    }
});

//------------------------------------------------------------------------------
// WATSON IBM - Connect to the IoT Foundation service
//------------------------------------------------------------------------------
// Create a client (used to send data)
var iotfClient = new Iotf.IotfDevice(iotfConfig);
// Connect to the initialized iotf service
iotfClient.connect();
// Handle errors coming from the iotf service
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
  console.log('ON REQUEST');
  res.end('----- Node CoAP Client end -----\n')
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
  postPressureIntoPlatform(value);

  // Controller of an external Z-Wave light
  zwaveController(value);
};

/**
* Save pressure value into MongoDB database.
*/
function postPressureIntoDatabase(value) {
  var port = 8000;
  var myIp = 'http://' + ip.address() + ':' + port;
  ('--- New pressure recorded in Database (' + myIP + ') as: ' + value + '---');
  request.post({
    headers: { 'content-type': 'application/json' },
    url: myIp + '/',
    body: value
  }, function(error, response, body){
    console.log('Pressure recorded successfull!');
  });
};

/**
* Save pressure value into platform database.
*/
function postPressureIntoPlatform(value) {
  // Reverse pressure value
  var pressure = '0';
  if(value === '0') {
    pressure = '1';
  }

  var payload = {
    id: 20,
    room: 1,
    pressure: Number(pressure),
    timestamp: new Date(),
  };

  iotfClient.publish('DS_status', 'json', JSON.stringify(payload) );

  console.log('--- New pressure recorded in Watson as: ' + pressure + '---');
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
