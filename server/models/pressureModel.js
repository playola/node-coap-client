var mongoose = require('mongoose');

var pressureSchema = mongoose.Schema({
    timestamp: Date,
    pressure: Number
});

module.exports = mongoose.model('Pressure', pressureSchema);
