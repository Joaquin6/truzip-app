var Q = require("q");
var express = require('express');
var router = express.Router();
var Geos = require('../models/geos');
var __geos = [];
var __zipsPerCity = {};
var __cityPerZips = {};

router.get('/list', function(req, res) {
	return res.send(__geos);
});

router.get('/:geo', function(req, res) {
	Geos.fetch(req.params.geo).then(function(doc) {
		return res.json(doc);
	}).fail(function(err) {
		res.statusCode = err.code;
		return res.json({
			error : err.message
		});
	}).done();
});

module.exports = router;
module.exports.prefetch = function() {
	Geos.fetchAll().then(function(doc) {
		for (var i = 0; i < doc.length; i++) {
			var geo = doc[i];
			__cityPerZips[geo.Zip] = geo.City;
			__geos.push(geo.Zip);
			var city = geo.City.toLowerCase();
			if (__zipsPerCity[city] == undefined) {
				__geos.push(geo.City);
				__zipsPerCity[city] = [];
			}
			__zipsPerCity[city].push(geo.Zip);
		}
	}).fail(function(err) {
		console.error('something is wrong!! - unable to prefech geos');
	}).done();
};
module.exports.getZips = function(city) {
	return __zipsPerCity[city.toLowerCase()];
};
module.exports.getCity = function(zip) {
	return __cityPerZips[zip];
};
