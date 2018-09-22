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
      var pressureModel = new pressureModel();
      // Define values
      var modelId = 1234;
      var modelTimestamp = new Date();
      var modelPressure = src.toString();
      var modelRoom = 0;
      // Set values into the model
      pressureModel.id = modelId;
      pressureModel.timestamp = modelTimestamp;
      pressureModel.pressure = modelPressure;
      pressureModel.room = modelRoom;

      // Save the record to the db
      pressureModel.save(function(err){
        if(err){
          res.send(err);
        } else {
          console.log('New pressure recorded in the database as:', modelPressure);
          res.send('New pressure recorded to the db');
        }
      });
    });
  });

module.exports = router;
