// Include packages
var express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    ip = require('ip'),
    request = require('request'),
    app = express(),
    port = 8000;

// Include routes
var indexRoute = require('./routes/index.js');
// Register routes
app.use('/', indexRoute);

// Include models
var db = require('./models/databaseModel.js');
var pressureModel = require('./models/pressureModel.js');

app.listen(port);

var myIp = 'http://' + ip.address() + ':' + port;
console.log('server listening on', myIp);

// Request the index route
request.post(myIp + '/');
