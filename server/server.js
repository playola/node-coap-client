var express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    ip = require('ip'),
    request = require('request'),
    cron = require('node-cron'),
    app = express(),
    port = 8000;

app.listen(port);
console.log('server listening on port',port);
