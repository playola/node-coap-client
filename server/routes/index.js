var express = require('express'),
    router = express.Router(),
    bodyparser = require('body-parser');

var pressureModel = require('../models/pressureModel.js');

// Router middleware
router.use(function(req, res, next){
  next();
});

router.route('/')
  .post(function(req, res){
    // Initialize model
    var thisPressureModel = new pressureModel();
    // Define values
    var thisTimestamp = new Date();
    var thisPressureValue = 1;
    // Set values into the model
    thisPressureModel.timestamp = thisTimestamp;
    thisPressureModel.pressure = thisPressureValue;

    // Save the record to the db
    thisPressureModel.save(function(err){
      if(err){
        res.send(err);
      } else {
        console.log('New pressure recorded in the database as:', thisPressureValue);
        res.send('New pressure recorded to the db');
      }
    });
  });

module.exports = router;
