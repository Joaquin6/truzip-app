var Q = require("q");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Exception = require('../libs/utils').Exception;

// Schema is empty - because we actually populate it from c# - (i.e. raw mongo) - so just grab everything in collection
var GeosSchema = new Schema({
});

GeosSchema.statics.fetch = function(geo) {
	var geo = geo.replace(/-/g, ' ');
	var deferred = Q.defer();
	var query = buildQuery(geo);
	this.find(query).lean().exec(function(err, doc) {
		if (!err && doc && doc.length > 0) {
			deferred.resolve(doc);
		} else {
			if (!doc || doc.length == 0) {
				deferred.reject(Exception('Not found', 404));
			} else {
				console.error('INTERNAL ERROR (%d): unable to fetch geo: %s', 500, geo);
				deferred.reject(Exception('Server error', 500));
			}
		}
	});
	return deferred.promise;
};

GeosSchema.statics.fetchAll = function() {
	var deferred = Q.defer();
	this.find({}, '-_id Zip City').lean().exec(function(err, doc) {
		if (!err && doc) {
			deferred.resolve(doc);
		} else {
			if (!doc) {
				deferred.reject(Exception('Not found', 404));
			} else {
				console.error('INTERNAL ERROR (%d): unable to fetch zipcodes', 500);
				deferred.reject(Exception('Server error', 500));
			}
		}
	});
	return deferred.promise;
};

function buildQuery(geo) {
	var query = {
		Zip : geo
	};
	if (isNaN(geo)) {
		var city = toTitleCase(geo);
		query = {
			City : city
		};
	}
	return query;
}

function toTitleCase(txt) {
	var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i;

	return txt.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function(match, index, title) {
		if (index > 0 && index + match.length !== title.length && match.search(smallWords) > -1 && title.charAt(index - 2) !== ":" && (title.charAt(index + match.length) !== '-' || title.charAt(index - 1) === '-') && title.charAt(index - 1).search(/[^\s-]/) < 0) {
			return match.toLowerCase();
		}

		if (match.substr(1).search(/[A-Z]|\../) > -1) {
			return match;
		}

		return match.charAt(0).toUpperCase() + match.substr(1);
	});
};

module.exports = mongoose.model('Geoloc', GeosSchema, 'geoloc');
