var mongoose = require('mongoose');
var secrets = require('../secrets.js');
var mongoAddress = secrets.getSecret('dbUri');

var options = {
  useNewUrlParser: true
};

mongoose.connect(mongoAddress, options);
