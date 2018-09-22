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

  // Save data in TheThings.io
  postPressureIntoPlatform(value);
};

/**
* Save pressure value into MongoDB database.
*/
function postPressureIntoDatabase(value) {
  var port = 8000;
  var myIp = 'http://' + ip.address() + ':' + port;
  console.log('posting on IP: ', myIp);
  console.log('Update database', value);
  //request.post(myIp + '/');
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
    values: [{
      key: 'demo_resource',
      value: Number(value)
    }]
  };

  var req = coap.request({
    host: 'coap.thethings.io',
    pathname: '/v2/things/' + secrets.getSecret('tokenId'),
    method: 'POST'
  });
  req.write(JSON.stringify(payload));

  req.on('response', function(res) {
    console.log('thethings.io response code: ', res.code);
  });

  req.end();
};
