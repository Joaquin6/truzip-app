var Q = require("q");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Exception = require('../libs/utils').Exception;
var Memcached = require('../libs/memcached');

// Schema is empty - because we actually populate it from c# - (i.e. raw mongo) - so just grab everything in collection
var SchoolsSchema = new Schema({
});

SchoolsSchema.statics.__processGeos = function(geos, callback) {
	var that = this;
	var geo = geos.shift();
	if (geo) {
		var promise = this.__fetchCache(geo);
		promise.then(function(results) {
			if (callback(results))
				that.__processGeos(geos, callback);
		}).done();
	} else
		callback(null);
};

SchoolsSchema.statics.fetch = function(geos) {
	var deferred = Q.defer();
	var schools = [];
	this.__processGeos(geos.slice(), function(results) {
		if (results == null) {
			deferred.resolve(schools);
			return false;
		}
		schools.push.apply(schools, results);
		return true;
	});
	return deferred.promise;
};

SchoolsSchema.statics.__fetchCache = function(geo) {
	var that = this;
	var deferred = Q.defer();
	console.info("attempting school cache for: " + geo);
	Memcached.getInstance().get("school_" + geo, function(err, data) {
		if (err || (data == undefined)) {
			console.info("cache miss: attempt database school fetch for: " + geo);
			that.__fetchDatabase(geo).then(function(data) {
				console.info("database school hit for: " + geo);
				that.__cache(geo, data);
				deferred.resolve(data);
			}).fail(function(err) {
				deferred.reject(err);
			}).done();
		} else {
			console.info("cache school hit for: " + geo);
			deferred.resolve(data);
		}
	});
	return deferred.promise;
};

SchoolsSchema.statics.__fetchDatabase = function(geo) {
	var deferred = Q.defer();
	if (( typeof geo) == "string")
		geo = parseInt(geo);
	var query = {
		'Zipcode' : geo
	};
	this.find(query).lean().exec(function(err, doc) {
		if (!err && doc) {
			deferred.resolve(doc);
		} else {
			if (!doc) {
				deferred.reject(Exception('Not found', 404));
			} else {
				console.error('INTERNAL ERROR (%d): unable to fetch zipcode: %s', 500, zipcode);
				deferred.reject(Exception('Server error', 500));
			}
		}
	});
	return deferred.promise;
};

SchoolsSchema.statics.__cache = function(geo, data) {
	Memcached.getInstance().set("school_" + geo, data, 0, function(err) {// set to 0 - never expire
		if (err)
			console.error(err);
	});
};

module.exports = mongoose.model('Schools', SchoolsSchema);
