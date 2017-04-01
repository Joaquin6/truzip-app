var Q = require("q");
var express = require('express');
var router = express.Router();
var email = require("emailjs/email");
var Properties = require('../models/properties');
var Schools = require('../models/schools');
var config = require("../config.json");
var Methods = require('../models/methods');

router.post('/email', function(req, res) {
	Methods.Email(req.body.from, req.body.to, req.body.subject, req.body.text).then(function() {
		res.sendStatus(200);
	}).fail(function() {
		return res.status(400).send("Bad Request.");
	}).done();
});

module.exports = router;

