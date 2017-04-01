var Q = require("q");
var express = require('express');
var router = express.Router();
var Deals = require('../models/deals');

router.get('/', function(req, res) {
	processDealRequest(res);
});

router.get('/force', function(req, res) {
	processDealRequest(res, undefined, true);
});

router.get('/:geo/force', function(req, res) {
	var geo = req.params.geo.replace(/-/g, ' ');
	processDealRequest(res, geo, true);
});

router.get('/:geo', function(req, res) {
	var geo = req.params.geo.replace(/-/g, ' ');
	processDealRequest(res, geo);
});

function processDealRequest(res, geo, force) {
	if (force) {
		var safeGeo = geo == undefined ? "California" : geo;
		console.log("Deal FORCE fetch requested for: " + safeGeo);
	}
	Deals.fetch(geo, force).then(function(deals) {
		return res.json(deals);
	}).fail(function(err) {
		console.error(err);
		return res.status(400).send("Bad Request.");
	}).done();
};
module.exports = router;

