/*
* Node CoAP Client
* CoAP Client that observe a sensor and sends its value to a platform.
* The platform thethings.io needs a TOKEN_ID to post data into their database.
*
* Default port 5638. Default action 'GET'
*/

var coap = require('coap'),
    server = coap.createServer({ type: 'udp6' }),
    ip = require('ip'),
    request = require('request'),
    secrets = require('../server/secrets.js');

server.on('request', function(req, res) {
  res.end('Starting CoAP Client\n')
});

server.listen(function() {
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
    timestamp: new Date()
  };

  console.log('Device simulator is connected to the IoT Foundation service');
  console.log('QoS level set to: ' + QosLevel);

  iotfClient.publish("DS_status", "json", JSON.stringify(payload) );
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
