var Q = require("q");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Exception = require('../libs/utils').Exception;
var sprintf = require("sprintf-js").sprintf;
var Methods = require('./methods');
var EmailTemplate = require('./templates');

var UsersSchema = new Schema({
	email : String,
	agent : String, // agent associated with this user (i.e the agent's lead)
	search : [{
		geo : String,
		city : String,
		county : String,
		filter : String,
		timestamp : Date
	}]
});

UsersSchema.statics.saveSearch = function(email, geo, city, county, filter, action, agent) {
	console.log('-- Begin To Attempt Save Search --');
	var that = this;
	var conditions = {
		email : email
	};
	this.findUser(conditions).then(function(doc) {
		console.log('-- Returning User Save Search --');
		that.__addNewSearch(doc[0], geo, city, county, filter, agent);
	}).fail(function(err) {
		console.log('-- New User Save Search --');
		that.__addNewUser(email, geo, city, county, filter, agent);
		var payload = {};
		payload.email = email;
		payload.geo = geo;
		payload.city = city;
		payload.county = county;
		payload.search = filter;
		payload.action = action;
		payload.alreadyAddedToDB = true;
		if (agent !== undefined)
			payload.agent = agent;
		that.welcome(payload);
	}).done();
};

UsersSchema.statics.deleteUser = function(email) {
	this.findOne({
		email : email
	}).remove().exec(function(err) {
		if (err)
			console.error('INTERNAL ERROR (%d): unable to remove user by email: %s', 500, email);
	});
};

UsersSchema.statics.findUser = function(conditions) {
	var deferred = Q.defer();
	if (conditions === undefined)
		conditions = {};
	this.find(conditions, function(err, doc) {
		if (!err) {
			if (doc.length == 0) {
				var error = {};
				error.noUsers = true;
				error.message = '-- No Users with No Agents Found: Returning Empty Document! No Users from DB --';
				console.log(error.message);
				deferred.reject(error);
			} else
				deferred.resolve(doc);
		} else {
			var error = {};
			error.client = _.clone(err);
			error.message = sprintf('-- INTERNAL ERROR - Client Error Name and Code: %s (%d): Unable to Find Users With Supplied Conditions: %s --', err.name, err.code, err);
			console.log(error.message);
			deferred.reject(error);
		}
	});
	return deferred.promise;
};

UsersSchema.statics.findNoAgentUsers = function(conditions) {
	// Get all users that have not been assigned to an agent
	var deferred = Q.defer();
	if (conditions === undefined) {
		conditions = {
			agent : 'no agent'
		};
	}
	this.find(conditions, function(err, doc) {
		if (!err) {
			if (doc.length == 0) {
				var error = {};
				error.noUsers = true;
				error.message = '-- No Users with No Agents Found: Returning Empty Document! No Users from DB --';
				console.log(error.message);
				deferred.reject(error);
			} else
				deferred.resolve(doc);
		} else {
			var error = {};
			error.client = _.clone(err);
			error.message = sprintf('-- INTERNAL ERROR - Client Error Name and Code: %s (%d): Unable to Find Users With Supplied Conditions: %s --', err.name, err.code, err);
			console.log(error.message);
			deferred.reject(error);
		}
	});
	return deferred.promise;
};

UsersSchema.statics.testEmail = function() {
	var json = '{"email":"kostya.vints@gmail.com","geo":"90066","city":"Los Angeles","county":"Los Angeles County","search":"{PriceFrom: Any,PriceTo:Any,BedBth:Any,Type:Any,SqFoot:Any,LotSize:Any,Year:Any}","action":"UserSignIn","alreadyAddedToDB":true}';
	var payload = JSON.parse(json);
	this.welcome(payload);
};

UsersSchema.statics.welcome = function(payload) {
	console.log('-- Beginning Welcome Email Process for New User --');
	var deferred = Q.defer();
	payload = this.__preparePayload(payload);
	var that = this;
	this.__welcome(payload).then(function(userMessage) {
		var userMsg = sprintf('-- Successfully Sent Welcome User Email! - TO: %s, SUBJECT: %s, GEO: %s --', userMessage.header.to, userMessage.header.subject, payload.geo);
		console.log(userMsg);
		userMsg = sprintf('-- Successfully Sent Welcome Email! - TO: %s, GEO: %s. --', userMessage.header.to, payload.geo);
		Methods.AdminEmail('user', 'We Have a New User!', userMsg);
		deferred.resolve(userMessage);
	}).fail(function(err) {
		console.log('-- INTERNAL ERROR: "welcome": There was a problem with User Email! --');
		deferred.reject(Exception(err, 500));
	}).done();
	return deferred.promise;
};

UsersSchema.statics.assignAgent = function(user, agent_Id) {
	var deferred = Q.defer();
	user.agent = agent_Id;
	this.__save(user).then(function(savedDoc) {
		console.log('-- Successfully Assigned Agent To User --');
		deferred.resolve(savedDoc);
	}).fail(function(err) {
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

UsersSchema.statics.__addNewUser = function(email, geo, city, county, filter, agent) {
	console.log('-- Saving User to DB --');
	var Users = mongoose.model('Users');
	var user = new Users({
		email : email,
		search : [{
			geo : geo,
			city : city,
			county : county,
			filter : filter,
			timestamp : (new Date()).getTime()
		}]
	});
	if (agent)
		user.agent = agent;
	else
		user.agent = 'no agent';
	this.__save(user).fail(function(err) {
		console.log(err);
	}).done();
};

UsersSchema.statics.__addNewSearch = function(doc, geo, city, county, filter, agent) {
	// make sure doc has an agent value only if agent is available
	if ((doc.agent === 'no agent' && agent !== undefined) || (!doc.agent && agent !== undefined))
		doc.agent = agent;
	else if (!doc.agent && !agent)
		doc.agent = 'no agent';
	var searchGeo,
	    i;
	// search through doc - for geo in question - then update (or add as needed)
	for ( i = 0; i < doc.search.length; i++) {
		var search = doc.search[i];
		searchGeo = search.geo.toLowerCase().replace(/-/g, ' ');
		geo = geo.toLowerCase().replace(/-/g, ' ');
		if (searchGeo == geo) {
			search.filter = filter;
			search.timestamp = (new Date()).getTime();
			this.__save(doc);
			return;
		}
	}
	// not found - so add new geo to user search history
	doc.search.push({
		geo : geo,
		city : city,
		county : county,
		filter : filter,
		timestamp : (new Date()).getTime()
	});
	// this.__save(doc);

	if (doc.agent === 'no agent') {
		this.__assignToAgent(doc, geo, filter);
	} else
		this.__save(doc);
};

UsersSchema.statics.__assignToAgent = function(doc, geo, filter) {
	var msg = sprintf('-- Returning User (%s) Has No Agent: Will Attempt to Assign Agent --', doc.email);
	console.log(msg);

	var env = global.config.environment;

	var payload = {};
	payload.geo = geo;
	payload.email = doc.email;
	payload.search = filter;
	payload.action = "AssignAgentFromSearch";

	var Agents = mongoose.model('Agents');
	var that = this;
	Agents.contact(payload).then(function(agentMessage) {
		var message;
		if (agentMessage.noAgent) {
			message = sprintf('-- Unable Assign Any Agents to Returning User (%s) with Geo Location: (%s). Will only save the search filter. --', doc.email, geo);
			console.log(message);
			if (doc.agent !== 'no agent')
				doc.agent = 'no agent';
		} else {
			if (agentMessage.agentID)
				doc.agent = agentMessage.agentID;
			message = sprintf('-- Successfully Assigned Agent (Internal Agent ID: %s) to Returning User (%s). --', doc.agent, doc.email);
			console.log(message);
			message = message + '\n This Means this user did not have an agent before, but now has been assigned to an agent due to his search params.';
			Methods.AdminEmail('agent', 'Returning User Has New Agent!', message);
		}
		that.__save(doc);
	}).fail(function(err) {
		console.log('-- INTERNAL ERROR: There was a problem assigning the agent to the user --');
		console.log(err);
		if (env === "dev")
			throw new Error(err);
	}).done();
};

UsersSchema.statics.__save = function(doc) {
	var deferred = Q.defer();
	console.log("-- **Saving User Document** --");
	doc.save(function(err, savedDoc) {
		if (err) {
			var error = sprintf('-- INTERNAL MONGO ERROR (%d): Unable to Save User: %s --', err.code, doc);
			console.log(error);
			deferred.reject(Exception(error, err.code));
		} else {
			console.log("-- Successfully Saved User Document --");
			deferred.resolve(savedDoc);
		}
	});
	return deferred.promise;
};

UsersSchema.statics.__preparePayload = function(payload) {
	if (payload.geo) {
		if (payload.multiSelect) {
			for (var f = 0; f < payload.geo.length; f++) {
				payload.geo[f] = payload.geo[f].toLowerCase();
				payload.geo[f] = payload.geo[f].replace(/-/g, ' ');
			}
		} else {
			payload.geo = payload.geo.toLowerCase();
			payload.geo = payload.geo.replace(/-/g, ' ');
		}
	}
	if (payload.interest) {
		if (payload.multiSelect) {
			for (var m = 0; m < payload.interest.length; m++) {
				payload.interest[m] = payload.interest[m].toLowerCase();
				payload.interest[m] = payload.interest[m].replace(/-/g, ' ');
			}
		} else {
			payload.interest = payload.interest.toLowerCase();
			payload.interest = payload.interest.replace(/-/g, ' ');
		}
	}
	if (payload.search) {
		payload.search = payload.search.toLowerCase();
		payload.search = payload.search.replace(/-/g, ' ');
	}
	if (payload.alreadyAddedToDB === undefined)
		payload.alreadyAddedToDB = null;
	return payload;
};

UsersSchema.statics.__welcome = function(payload) {
	var that = this;
	var deferred = Q.defer();
	if (payload.alreadyAddedToDB === null) {
		console.log('-- Welcoming User is Already in the DB --');
		var conditions = {
			email : payload.email
		};
		this.findUser(conditions).then(function(user) {
			// if found, we reject!!
			// Means No message will be sent because user is not new!
			deferred.reject('Not a new User!');
		}).fail(function(err) {
			// if not found, we resolve!!
			// Means We will be sending that welcome email! This is a new user!
			var agent;
			if (payload.agent)
				agent = payload.agent;
			that.__addNewUser(payload.email, payload.geo, payload.city, payload.county, payload.search, agent);
			that.__getUserEmailContext(payload).then(function(userEmail) {
				console.log('-- Begin Attempt to send Welcome User Email --');
				Methods.Email("user@truzip.com", userEmail.to, userEmail.subject, userEmail.text, userEmail.attachments).then(function(userMessage) {
					deferred.resolve(userMessage);
				});
			}).catch(function(err) {
				console.log('-- INTERNAL ERROR: "__welcome": There was an problem building/sending the User Template! --');
				deferred.reject(err);
			}).done();
		}).done();
	} else {
		console.log('-- Welcoming User is Not in the DB Yet --');
		this.__getUserEmailContext(payload).then(function(userEmail) {
			console.log('-- Begin Attempt to send Welcome User Email --');
			Methods.Email("user@truzip.com", userEmail.to, userEmail.subject, userEmail.text, userEmail.attachments).then(function(userMessage) {
				deferred.resolve(userMessage);
			});
		}).catch(function(err) {
			console.log('-- INTERNAL ERROR: "__welcome": There was an problem building/sending the User Template! --');
			deferred.reject(err);
		}).done();
	}
	return deferred.promise;
};

UsersSchema.statics.__getUserEmailContext = function(payload) {
	var deferred = Q.defer();
	var bind = {};
	bind.email = payload.email;
	bind.city = payload.geo;
	bind.action = payload.action;
	bind.to = bind.email;
	bind.multiSelect = payload.multiSelect || false;
	bind.multiInterest = payload.multiInterest || null;
	EmailTemplate.getUserEmailTemplate(bind).then(function(context) {
		console.log('-- User Email Template Was Successfully Generated --');
		deferred.resolve(context);
	}).fail(function(err) {
		console.log('-- INTERNAL ERROR: "__getUserEmailContext": There was an problem getting the User Template! --');
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

module.exports = mongoose.model('Users', UsersSchema);
