var mongoose = require('mongoose');

var pressureSchema = mongoose.Schema({
    id: Number,
    timestamp: Date,
    pressure: Number,
    room: Number
});

module.exports = mongoose.model('Pressure', pressureSchema);
