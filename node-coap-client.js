/*
* Author: Pol Layola
* Date: June 2018
*
* Node CoAP Client
* CoAP Client that observe a sensor and sends its value to a platform.
* The platforms thethings.io needs a TOKEN_ID to post data into their database.
*
* Default port 5638. Default action 'GET'
*
* References: https://github.com/mcollina/node-coap
*/

var coap = require('coap');
var bl = require('bl');
var server = coap.createServer({ type: 'udp6' });

server.on('request', function(req, res) {
  res.end('Starting CoAP Client\n')
});

server.listen(function() {
  coap
    .request({
      host: 'COAP_IP',
      pathname: '/sensors/pressure',
      observe: true,
      method: 'GET'
    })
    .on('response', function(res) {
      console.log('error code ', res.code);
      if (res.code !== '2.05') return process.exit(1);

      res.pipe(bl(function(err, data) {
        var json = JSON.parse(data)
        console.log('json ', json)
        process.exit(0)
      }))
    })
    .end()
});

/*
function updateDatabase(val) {
  console.log(typeof(val));
  var payload = {
    values: [{
      key: "demo_resource",
      value: Number(val)
    }]
  };

  var req = coap.request({
    host: 'coap.thethings.io',
    pathname: '/v2/things/TOKEN_ID',
    method: 'POST'
  });

  req.write(JSON.stringify(payload));

  req.on('response', function(res) {
    var response = res.pipe(process.stdout);
    console.log('thethings.io response: ', response);
  });

  req.end();
};
*/
