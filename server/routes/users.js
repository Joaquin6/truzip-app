var Q = require("q");
var express = require('express');
var router = express.Router();
var Users = require('../models/users');
var Geos = require('../models/geos');
var Utils = require('../libs/utils');

router.post('/search', function(req, res) {
	var agent;
	if (req.body.agent)
		agent = req.body.agent;
	if (Utils.isAdminEmail(req.body.email)) {
		console.log('-- Admin user has signed in - ignoring user: ' + req.body.email + '  --');
	} else {
		Geos.fetch(req.body.geo).then(function(geoDoc) {
			req.body.county = geoDoc[0].County;
			req.body.city = geoDoc[0].City;
			Users.saveSearch(req.body.email, req.body.geo, req.body.city, req.body.county, req.body.filter, req.body.action, agent);
		}).done();
	}
	res.sendStatus(200);
});

router.delete('/:email', function(req, res) {
	var email = req.params.email;
	Users.deleteUser(email);
	res.sendStatus(200);
});

router.get('/:email', function(req, res) {
	var email = req.params.email;
	Users.find(email).then(function(user) {
		return res.json(user.toObject());
	}).fail(function(err) {
		console.error(err);
		return res.status(400).send("Not Found.");
	}).done();
});

router.post('/welcome', function(req, res) {
	Geos.fetch(req.body.geo).then(function(geoDoc) {
		req.body.county = geoDoc[0].County;
		Users.welcome(req.body).then(function(userMessage) {
			return res.json(userMessage);
		}).fail(function(err) {
			var statusCode = 400;
			if (err.statusCode)
				statusCode = err.statusCode;
			return res.status(statusCode).send(err);
		}).done();
	}).done();
});

module.exports = router;

