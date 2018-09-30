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
    req.on('data', function(src) {
      // Initialize model
      var thisPressureModel = new pressureModel();
      // Define values
      var modelId = 20;
      var modelTimestamp = new Date();
      // Reverse pressure value
      var pressure = '0';
      if(src.toString() === '0') {
        pressure = '1';
      }
      var modelPressure = pressure;
      var modelRoom = 1;
      // Set values into the model
      thisPressureModel.id = modelId;
      thisPressureModel.timestamp = modelTimestamp;
      thisPressureModel.pressure = modelPressure;
      thisPressureModel.room = modelRoom;

      // Save the record to the db
      thisPressureModel.save(function(err){
        if(err){
          res.send(err);
        } else {
          console.log('----- New pressure recorded in the database as:', modelPressure + ' -----');
          res.send('New pressure recorded to the db');
        }
      });
    });
  });

module.exports = router;
