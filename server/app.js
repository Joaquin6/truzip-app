var express = require('express');
var compression = require('compression');
var path = require('path');
var app = express();
var config = require("./config.json");
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var crypto = require('crypto');
var fs = require("fs");
var http = require('http');
var mongoose = require('mongoose');
var device = require('express-device');
var api = require('./routes/api');
var memcached = require('./libs/memcached');
var Utils = require('./libs/utils');
var deals = require('./models/deals');
var Q = require("q");
var sprintf = require("sprintf-js").sprintf;

readEnvironment();
setupEnvironment();
listen();

function readEnvironment() {
	var myArgs = process.argv.slice(2);
	for (var i = 0; i < myArgs.length; i++) {
		if (myArgs[i].indexOf('e') > 0) {
			config.environment = myArgs[++i];
		}
	}
	console.info("Environment: " + config.environment);
	console.info("Stripe mode: " + config.stripe.mode);
	console.info("Stripe plan: " + config.stripe[config.stripe.mode].subscription.plan_name);
	global.config = config;
}

function setupEnvironment() {
	var rootPath = '../client';
	if (config.environment == 'spike')
		rootPath = '../templates';
	var logDir = null;
	var port = 80;
	var myArgs = process.argv.slice(2);
	for (var i = 0; i < myArgs.length; i++) {
		if (myArgs[i].indexOf('p') > 0)
			port = myArgs[++i];
	}
	app.set('port', process.env.PORT || port);
	app.use(compression());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
		extended : false
	}));
	app.use(methodOverride());
	app.use(express.static(path.join(__dirname, rootPath)));
	initModules();
	app.use(device.capture({
		parseUserAgent : true
	}));
	device.enableDeviceHelpers(app);

	api.route(app);
	app.use(function(req, res) {
		// res.locals: gives us the device types such as "is_desktop" or "is_phone"
		logDeviceDetails(req.device, req.url);
		var newUrl = 'http://' + req.get('Host') + '/#' + req.url;
		if (req.url.toString().indexOf('/agent') > -1) {
			// only do it for agent (and not for agentown - which is regular http (for now))
			if (req.url.toString().indexOf('/agentown') == -1) {
				if (!req.secure && config.environment != 'dev')
					newUrl = 'https://' + req.get('Host') + '/#' + req.url;
			}
		}
		return res.redirect(newUrl);
	});

	process.on('uncaughtException', function(err) {
		console.error('Caught exception: ' + err);
	});
}

function initModules() {
	initMemcached();
	initDatabase();
	initDeals(true);
	initDebugPromises();
}

function initMemcached() {
	memcached.initialize();
}

function initDeals(firstime) {
	var countDownTime = getCountDownToNextDeal(firstime);
	var dhm = Utils.daysHoursMinsFormat(countDownTime);
	console.log("Generating Deals in - " + dhm);
	setTimeout(function() {
		console.log("Currently Generating Deals: " + new Date());
		deals.fetch(undefined, true).done();
		initDeals();
	}, countDownTime);
}

function getCountDownToNextDeal(firstime) {
	// first see how long before 2:00 am  - this is when we should set recurring interval to refresh deals
	var today = new Date();
	var nowHours = today.getHours();
	var diff = 2 - nowHours;
	startTime = new Date(today);
	if (diff < 0) {
		// this means we have to wait till next day (to refresh), so add 1 day and set it to 2am in the morning
		startTime.setDate(today.getDate() + 1);
		startTime.setHours(2, 0, 0);
	} else if (diff == 0) {
		// in this case it could be at 2 - 2:59:59
		// if first time - then just wait 1 min - before starting up
		if (firstime)
			return 1000 * 60;
		// else wait till 2 am - next day
		startTime.setDate(today.getDate() + 1);
		startTime.setHours(2, 0, 0);
	} else {
		// this means - that time is before 2 in the morning, so in this case it's the current date at 2 am
		startTime = today.setHours(2, 0, 0);
	}
	// now get the difference between current time and startTime - this is the countdowntime
	var countDownTime = startTime - new Date().getTime();
	return countDownTime;
}

function initDatabase() {
	var host = config[config.environment].host;
	var dbPath = "mongodb://" + config.username + ":" + config.password + "@" + host + ":" + config.port + "/" + config.database;
	console.log(dbPath);
	mongoose.connect(dbPath);
	var db = mongoose.connection;
	db.on('error', function(err) {
		console.error('Connection error:', err.message);
	});
	db.once('open', function callback() {
		console.info("Connected to DB!");
	});
}

function logDeviceDetails(reDevice, visitingPage) {
	var dType = reDevice.type;
	//var dName = reDevice.name;
	var dFamily = reDevice.parser.useragent.family;
	var deviceMsg = sprintf('-- URL "%s" hit with a detected "%s" device using "%s" as the useragent. --', visitingPage, dType, dFamily);
	console.log(deviceMsg);
}

function initDebugPromises() {
	if (config.environment === "dev") {
		Q.longStackSupport = true;
		console.info("Enabled Q's Long Stack Traces");
	}
}

function listen() {
	var server = http.createServer(app);
	server.listen(app.get('port'));
	console.log('node started on port: ' + app.get('port'));
}