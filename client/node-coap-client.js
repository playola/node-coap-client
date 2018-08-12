/*
* Node CoAP Client
* CoAP Client that observe a sensor and sends its value to a platform.
* The platform thethings.io needs a TOKEN_ID to post data into their database.
*
* Default port 5638. Default action 'GET'
*/

var coap = require('coap'),
    server = coap.createServer({ type: 'udp6' }),
    secrets = require('../server/secrets.js'),
    ip = require('ip'),
    request = require('request');

server.on('request', function(req, res) {
  res.end('Starting CoAP Client\n')
});

server.listen(function() {
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
        updateDatabase(value);
      });
    })
    .end()
});

function updateDatabase(value) {
  console.log('update database', value);
  postPressureIntoDatabase(value);
  var payload = {
    values: [{
      key: "demo_resource",
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

function postPressureIntoDatabase(value) {
  var port = 8000;
  var myIp = 'http://' + ip.address() + ':' + port;
  console.log('server listening on', myIp);
  request.post(myIp + '/');
}
