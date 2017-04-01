var Q = require("q");
var express = require('express');
var router = express.Router();
var methods = require('../models/methods');
var Agents = require('../models/agents');
var timexe = require('timexe');
var multer = require('multer');
//var Users = require('../models/users');

router.get('/:agentId/:subId', function(req, res) {
	Agents.getSubscription(req.params.agentId, req.params.subId).then(function(sub) {
		return res.json(sub);
	}).fail(function(err) {
		var statusCode = 400;
		if (err.statusCode)
			statusCode = err.statusCode;
		return res.status(statusCode).send(err);
	}).done();
});

router.post('/checkoutconfigs', function(req, res) {
	var config = global.config;
	var checkoutConfigs = {
		key : config.stripe[config.stripe.mode].keys.publishable_key,
		chargePerLead : config.options.charges.per_lead,
		total_plans : config.options.total_plans
	};
	return res.json(checkoutConfigs);
});

router.post('/add', function(req, res) {
	var debugging = false;
	if (debugging)
		return res.json({});

	Agents.add(req.body).then(function(agent) {
		return res.json(agent);
	}).fail(function(err) {
		console.log('AgentRoute: failure /add: ' + JSON.stringify(err));
		var statusCode = 400;
		if (err.statusCode)
			statusCode = err.statusCode;
		return res.status(statusCode).send(err);
	}).done();
});

router.post('/contact', function(req, res) {
	Agents.contact(req.body).then(function(agentMessage) {
		return res.json(agentMessage);
	}).fail(function(err) {
		console.log('AgentRoute: failure /contact: ' + JSON.stringify(err));
		var statusCode = 400;
		if (err.statusCode)
			statusCode = err.statusCode;
		return res.status(statusCode).send(err);
	}).done();
});

router.post('/events', function(req, res) {
	Agents.handleWebhook(req.body);
	res.sendStatus(200);
});

var storage = multer.diskStorage({
	destination : function(req, file, callback) {
		callback(null, __dirname + '/../../client/images/photos');
	},
	filename : function(req, file, callback) {
		req.res.uploadedFileName = "" + Date.now() + file.originalname;
		callback(null, req.res.uploadedFileName);
	}
});

//https://github.com/expressjs/multer
var upload = multer({
	storage : storage
}).single('userPhoto');

router.post('/photo', function(req, res) {
	upload(req, res, function(err) {
		console.log(__dirname);
		if (err) {
			console.log('AgentRoute: Unable to upload file: ' + err.message + ', ' + JSON.stringify(err)); 
			return res.end("Error uploading file.");
		}
		console.log('AgentRoute: saved to image:' + res.uploadedFileName);
		res.end(res.uploadedFileName);
	});
});

module.exports = router;
module.exports.startDailyReports = function() {
	//Agents.testEmail();
	//Users.testEmail();
	timexe("* * * 7", function() {
		// Daily ADS Report will be sent every morning @ 7:00AM
		Agents.sendAdsReport();
	});
};
