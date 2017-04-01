var sprintf = require("sprintf-js").sprintf;
var Q = require("q");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Exception = require('../libs/utils').Exception;
var Memcached = require('../libs/memcached');
var Methods = require('../models/methods');
var EmailTemplate = require('../models/templates');
var _ = require('underscore');

// Schema is empty - because we actually populate it from c# - (i.e. raw mongo) - so just grab everything in collection
var PropertiesSchema = new Schema({
});

PropertiesSchema.statics.fetch = function(geos, filter, partial) {
	if (geos == undefined)
		if (partial == undefined)
			partial = true;
	var deferred = Q.defer();
	var properties = [];
	if (geos == undefined)
		deferred.resolve(properties);
	else {
		this.__processGeos(geos.slice(), filter, function(results, leftToProcess) {
			if ((results != null) && results.length > 0)
				properties.push.apply(properties, results);
			if (partial) {
				if (properties.length > 300) {
					var remove = properties.length - 300;
					properties.splice(0, remove);
					deferred.resolve(properties);
					return false;
				}
			}
			if (leftToProcess == 0)
				deferred.resolve(properties);
			return true;
		});
	}
	return deferred.promise;
};

PropertiesSchema.statics.emailPropertyInfo = function(data) {
	var deferred = Q.defer();
	var userEmail = data.email;
	var that = this;
	this.__getEmailContext(data).then(function(propEmail) {
		Methods.Email("user@truzip.com", userEmail, propEmail.subject, propEmail.text, propEmail.attachments).then(function(propMessage) {
			console.log('-- Property Details Email Sent Successfully. TO: ' + propMessage.header.to + '. SUBJECT: ' + propEmail.subject + ' --');
			deferred.resolve(propMessage);
		}).fail(function(err) {
			console.log(err);
			deferred.reject(err);
		}).done();
	}).fail(function(err) {
		console.log(err);
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

PropertiesSchema.statics.__processGeos = function(geos, filter, callback) {
	var that = this;
	var geo = geos.shift();
	if (geo) {
		var promise = this.__fetchCache(geo, filter);
		promise.then(function(results) {
			if (callback(results))
				that.__processGeos(geos, filter, callback);
		}).done();
	} else
		callback(null, geos.length);
};

PropertiesSchema.statics.__fetchCache = function(geo, filter) {
	var that = this;
	var deferred = Q.defer();
	console.info("attempting property cache for: " + geo);
	Memcached.getInstance().get(geo, function(err, data) {
		if (err || (data == undefined)) {
			console.info("cache miss: attempt database property fetch for: " + geo);
			that.__fetchDatabase(geo).then(function(data) {
				console.info("database property hit for: " + geo);
				that.__cache(geo, data);
				var filtered = that.__filter(data, filter);
				deferred.resolve(filtered);
			}).fail(function(err) {
				deferred.reject(err);
			}).done();
		} else {
			// if cache from scraper then in json - database returns an object
			if ( typeof data == "string") {
				data = JSON.parse(data);
				// save it back to cache as an object
				that.__cache(geo, data);
			}
			console.info("cache property hit for: " + geo);
			var filtered = that.__filter(data, filter);
			deferred.resolve(filtered);
		}
	});
	return deferred.promise;
};

PropertiesSchema.statics.__fetchDatabase = function(geo) {
	var deferred = Q.defer();
	var query = {
		'ZipCode' : geo
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

PropertiesSchema.statics.__cache = function(geo, data) {
	Memcached.getInstance().set(geo, data, 0, function(err) {// set to 0 - never expire
		if (err)
			console.error(err);
	});
};

PropertiesSchema.statics.__filter = function(properties, filter) {
	var filtered = [];
	filter = this.__formatFilter(filter);
	if (filter == null)
		return properties;
	for (var i = 0; i < properties.length; i++) {
		var property = properties[i];
		if (property.Price) {
			if (filter.min && filter.max) {
				if (!(property.Price > filter.min && property.Price < filter.max))
					continue;
			} else {
				if (filter.min) {
					if (!(property.Price >= filter.min))
						continue;
				} else if (filter.max) {
					if (!(property.Price <= filter.max))
						continue;
				}
			}
		}
		if (filter.bed) {
			if (!(property.Bedrooms && property.Bedrooms >= filter.bed))
				continue;
		}
		if (filter.bath) {
			if (!(property.BathroomsFull && property.BathroomsFull >= filter.bath))
				continue;
		}
		if (filter.type) {
			if (!(property.PropertyType && property.PropertyType == filter.type))
				continue;
		}
		if (filter.lot) {
			if (!(property.LotSize && property.LotSize >= filter.lot))
				continue;
		}
		if (filter.sqfoot) {
			if (!(property.LivingArea && property.LivingArea >= filter.sqfoot))
				continue;
		}
		if (filter.year) {
			if (!(property.YearBuilt && property.YearBuilt >= filter.year))
				continue;
		}
		// Now we also make sure that this property is hidden with 'IsHiddenDeal'
		if (property.IsHiddenDeal)
			continue;
		if (property.IsExcludeFromAlgo)
			continue;
		filtered.push(property);
	}
	return filtered;
};

PropertiesSchema.statics.__formatFilter = function(filter) {
	if (filter == undefined)
		return null;
	var format = {};
	if (filter.min)
		format.min = parseInt(filter.min);
	if (filter.max)
		format.max = parseInt(filter.max);
	if (filter.bed)
		format.bed = parseInt(filter.bed);
	if (filter.bath)
		format.bath = parseInt(filter.bath);
	if (filter.type)
		format.type = parseInt(filter.type);
	if (filter.lot)
		format.lot = parseInt(filter.lot);
	if (filter.sqfoot)
		format.sqfoot = parseInt(filter.sqfoot);
	if (filter.year) {
		var currentYear = new Date().getFullYear();
		format.year = currentYear - parseInt(filter.year);
	}
	return format;
};

PropertiesSchema.statics.__getEmailContext = function(data) {
	var deferred = Q.defer();
	data.to = data.email;
	EmailTemplate.getUserEmailTemplate(data).then(function(context) {
		deferred.resolve(context);
	}).fail(function(err) {
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

module.exports = mongoose.model('Properties', PropertiesSchema);
