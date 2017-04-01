var Q = require("q");
var express = require('express');
var router = express.Router();
var Properties = require('../models/properties');
var Schools = require('../models/schools');
var Geos = require('./geos');

router.get('/', function(req, res) {
	res.statusCode = 400;
	return res.json({
		error : 'Please supply a zipcode'
	});
});

router.post('/getpropertyinfo', function(req, res) {
	Properties.emailPropertyInfo(req.body).then(function(sub) {
		return res.json(sub);
	}).fail(function(err) {
		var statusCode = 400;
		if (err.statusCode)
			statusCode = err.statusCode;
		return res.status(statusCode).send(err);
	}).done();
});

router.get('/:geo', function(req, res) {
	var geo = req.params.geo.replace(/-/g, ' ');
	var geoList = geo;
	// if this is a city we're passing then return a list of zips
	if (isNaN(geo))
		geoList = Geos.getZips(geo);
	else {
		if (!( geo instanceof Array))
			geoList = [geo];
	}
	if (geoList == undefined) {
		var doc = {};
		doc.schools = [];
		doc.properties = [];
		return res.json(doc);
	}

	var properties = Properties.fetch(geoList, req.query);
	var schools = Schools.fetch(geoList);

	Q.allSettled([properties, schools]).spread(function(properties, schools) {
		if ((properties.state === "rejected") || (schools.state === "rejected")) {
			return res.status(400).send("Bad Request.");
		} else {
			var doc = {};
			doc.schools = schools.value;
			doc.properties = properties.value;
			return res.json(doc);
		}
	}).done();
});

module.exports = router;

