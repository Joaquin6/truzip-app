var mongoose = require('mongoose');

var libs = process.cwd() + '/libs/';

var config = require(process.cwd() + '/config.json');

var dbPath = "mongodb://" + config.username + ":" + config.password + "@" + config.host + ":" + config.port + "/" + config.database;

mongoose.connect(dbPath);

var db = mongoose.connection;

db.on('error', function(err) {
	console.error('Connection error:', err.message);
});

db.once('open', function callback() {
	console.info("Connected to DB!");
});

module.exports = mongoose;
