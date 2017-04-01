var _ = require('underscore');
var Q = require("q");
var mongoose = require('mongoose');
var merge = require('mongoose-merge-plugin');
var sprintf = require("sprintf-js").sprintf;
var Schema = mongoose.Schema;
var config = require("../config.json");
var Stripe = require("../libs/stripe");
var Exception = require('../libs/utils').Exception;
var Geos = require('../models/geos');
var Methods = require('../models/methods');
var EmailTemplate = require('../models/templates');
var Utils = require('../libs/utils');

mongoose.plugin(merge);

var LeadsSchema = new Schema({
	email : String, // buyer email
	date : Date // once satisfied - reduce satisfy - and add to history.leads
});

var InvoicesSchema = new Schema({
	invoice_id : String, // stripe invoice id.
	attempted : Boolean, // Whether or not an attempt has been made to pay the invoice.
	closed : Boolean, // Whether or not the invoice is still trying to collect payment.
	paid : Boolean, // Whether or not payment was successfully collected for this invoice.
	date : Date // The time at which webhooks for this invoice were successfully delivered
});

var SubscriptionsSchema = new Schema({
	subscription_id : String,
	token : String, // stripe token
	enabled : Boolean,
	signedUp : Date,
	geo : String,
	county : String,
	qty : Number, // at time of signup - how many subscriptions are required per month
	satisfy : Number, // these are how many are needed to be satisfied - at start qty == statisfy
	history : {
		leads : [LeadsSchema],
		invoices : [InvoicesSchema]
	}
});

var AgentsSchema = new Schema({
	firstName : String,
	lastName : String,
	email : String,
	customer_id : String, // stripe id. To find agent in our stripe account
	subscriptions : [SubscriptionsSchema]
});

AgentsSchema.statics.testEmail = function() {

	var agentId = "cus_8O3xGkXt6hBDfu";
	var subId = "sub_8O3xtBWOt8gZf9";
	var that = this;
	this.getSubscription(agentId, subId).then(function(sub) {
		sub.action = "AgentSignUp";
		that.__sendNotificationEmail({}, sub, true);
	}).done();
};

AgentsSchema.statics.add = function(payload) {
	var deferred = Q.defer();
	var that = this;
	this.__handleAdd(payload).then(function(agent) {
		var isNewAgent = agent.isNewAgent;
		delete agent.isNewAgent;
		that.__satisfyNewSubscription(agent).then(function(agent) {
			var subject,
			    message;
			if (isNewAgent) {
				subject = 'New Agent Subscribed!';
				message = sprintf('New Agent (%s) bought a new subscription with %d leads in the city of %s.', payload.email, parseInt(payload.leads), payload.geo);

				// ask stripe for agent info...then send agent their invoice
				var agentId = agent.customer_id;
				var subId = agent.subscriptions[agent.subscriptions.length - 1].subscription_id;
				that.getSubscription(agentId, subId).then(function(sub) {
					sub.action = "AgentSignUp";
					that.__sendNotificationEmail(agent, sub, true);
				}).done();
			} else {
				subject = 'Returning Agent Subscribed!';
				message = sprintf('Returning Agent (%s) bought a new subscription with %d leads in the city of %s.', payload.email, parseInt(payload.leads), payload.geo);
			}
			var logmessage = sprintf('-- About to send Admin Email: %s, Message: %s --', subject, message);
			console.log(logmessage);

			// ask stripe for agent info...then send agent their invoice
			var agentId = agent.customer_id;
			var subId = agent.subscriptions[agent.subscriptions.length - 1].subscription_id;
			that.getSubscription(agentId, subId).then(function(sub) {
				sub.action = "AgentSignUp";
				that.__sendNotificationEmail(agent, sub, true);
			}).done();

			Methods.AdminEmail('agent', subject, message);
			deferred.resolve(agent);
		}).fail(function(err) {
			console.log(err);
			deferred.reject(err);
		}).done();
	}).fail(function(err) {
		var message = err;
		if (err.message)
			message = err.message;
		console.log(message);
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.findAgent = function(conditions) {
	var deferred = Q.defer();
	if (conditions === undefined)
		conditions = {};
	this.find(conditions, function(err, doc) {
		if (!err) {
			if (doc.length == 0) {
				var error = {};
				error.message = '-- No Agent Found: Returning Empty Document! No Agents from DB --';
				console.log(error.message);
				deferred.reject(error);
			} else
				deferred.resolve(doc);
		} else {
			var error = {};
			error.client = _.clone(err);
			error.message = sprintf('-- INTERNAL ERROR - Client Error Name and Code: %s (%d): Unable to Find Agent With Supplied Conditions: %s --', err.name, err.code, err);
			console.log(error.message);
			deferred.reject(error);
		}
	});
	return deferred.promise;
};

AgentsSchema.statics.contact = function(payload) {
	var deferred = Q.defer();
	if (Utils.isAdminEmail(payload.email)) {
		var msg = '-- Admin user has signed in - ignoring user: ' + payload.email + '  --';
		console.log(msg);
		deferred.resolve(msg);
	} else {
		var that = this;
		payload = this.__preparePayload(payload);
		this.__contact(payload).then(function(agentMessage) {
			var message = sprintf('-- Agent Email Sent Successfully! - TO: %s, SUBJECT: %s --', agentMessage.header.to, agentMessage.header.subject);
			console.log(message);
			Methods.AdminEmail('user', 'New Lead Activity - Agent Notified!', message);
			deferred.resolve(agentMessage);
		}).fail(function(err) {
			var message = err;
			if (err.emailNotNeeded && err.action === "UserSignIn") {
				console.log('-- No need to send email because returning user either deleted cookie OR is using another browser --');
				deferred.resolve(err);
			} else if (err.noAgent) {
				console.log('-- No Agent Found: Sending User Info to Admin Instead --');
				that.__addUserDetails(err, err.payload);
				if (err.message) {
					console.log(err.message);
					message = err.message;
				}
				switch (err.payload.action) {
				case "UserSignIn":
				case "MainBuyForLess":
				case "MainSellForMore":
					Methods.AdminEmail('admin', 'No Agent For New Lead!', message);
					break;
				}
				deferred.resolve(err);
			} else {
				if (err.message)
					message = err.message;
				Methods.AdminEmail('admin', 'No Agent Found!', message);
				deferred.reject(err);
			}
		}).done();
	}
	return deferred.promise;
};

AgentsSchema.statics.handleWebhook = function(webhook) {
	var payload = webhook.data.object;
	var action = webhook.type;
	var that = this;
	this.__handleWebhook(action, payload).then(function(agent) {
		var msg = sprintf('-- Webhook Event: "%s" - Was Handled Successfully. --', action);
		console.log(msg);
	}).fail(function(err) {
		console.log(err);
		Methods.AdminEmail('admin', 'WEBHOOK ERROR! - Truzip', err);
	}).done();
};

AgentsSchema.statics.getSubscription = function(agentId, subId) {
	var that = this;
	var deferred = Q.defer();
	Stripe.getSubscriptionById(agentId, subId).then(function(sub) {
		if (sub.metadata.firstName != undefined)
			deferred.resolve(sub);
		else {
			Stripe.getAgentById(sub.customer).then(function(customer) {
				sub.metadata = customer.metadata;
				deferred.resolve(sub);
			}).fail(function(err) {
				deferred.reject(err);
			}).done();
		}
	}).fail(function(err) {
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.sendAdsReport = function() {
	console.log("-- Sending Truzip Agents Ads Report --");
	this.__handleSendAdsReport().then(function(report) {
		console.log("-- Truzip Agents Ads Report Was Sent Successfully --");
	}).fail(function(err) {
		console.log("-- There was a Problem Sending Truzip Agents Ads Report --");
		console.log(err);
	}).done();
};

AgentsSchema.statics.__handleAdd = function(payload) {
	var deferred = Q.defer();
	var conditions = {
		email : payload.email
	};
	var that = this;
	this.findAgent(conditions).then(function(doc) {
		var msg = sprintf('-- Handleling Returning Agent (%s). Adding New Subscription for Agent --', payload.email);
		console.log(msg);
		that.__handleReturningAgent(doc[0], payload).then(function(agent) {
			deferred.resolve(agent);
		}).fail(function(err) {
			console.log(err);
			deferred.reject(err);
		}).done();
	}).fail(function(err) {
		Stripe.findAgent(conditions).then(function(agent) {
			// If we get here, this means Agent is a customer on our Stripe Account BUT not registered in our DB
			var msg = sprintf('-- Agent (%s) is an existing customer in Stripe but its not registered in our DB --', payload.email);
			console.log(msg);
			console.log('-- Handleling Returning Agent. Adding Agent to our DB and Adding New Subscription for Agent --');
			if (!payload.customer_id)
				payload.customer_id = agent.id;
			that.__addAgentToDB(payload).then(function(agent) {
				that.__addNewSubscription(agent, payload).then(function(agent) {
					that.__save(agent).then(function(savedDoc) {
						savedDoc.isNewAgent = false;
						deferred.resolve(savedDoc);
					});
				});
			}).catch(function(err) {
				console.log(err);
				deferred.reject(err);
			}).done();
		}).fail(function(err) {
			var msg = sprintf('-- Handleling New Agent (%s). Adding New Subscription for Agent --', payload.email);
			console.log(msg);
			that.__handleNewAgent(payload).then(function(agent) {
				deferred.resolve(agent);
			}).fail(function(err) {
				deferred.reject(err);
			}).done();
		}).done();
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__handleReturningAgent = function(doc, payload) {
	var deferred = Q.defer();
	var that = this;
	this.__addNewSubscription(doc, payload).then(function(agent) {
		that.__save(agent).then(function(savedDoc) {
			agent.isNewAgent = false;
			deferred.resolve(savedDoc);
		});
	}).catch(function(err) {
		console.log(err);
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__handleNewAgent = function(payload) {
	var deferred = Q.defer();
	this.__addNewAgent(payload).then(function(agent) {
		agent.isNewAgent = true;
		deferred.resolve(agent);
	}).fail(function(err) {
		console.log(err);
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__satisfyNewSubscription = function(agent) {
	console.log("-- Begin To Attempt and Satisfy Agents New Subscription --");
	var deferred = Q.defer();
	var subIndx = agent.subscriptions.length - 1;
	var subscription = agent.subscriptions[subIndx];
	var that = this;
	this.__getUsersWithNoAgentByGeo(subscription).then(function(users) {
		that.__addUsersToNewSubscription(users, agent).then(function(satisfiedAgent) {
			var message = sprintf('-- Successfully Satisfied Agents New Subscription with "%d" leads --', users.length);
			console.log(message);
			deferred.resolve(satisfiedAgent);
		});
	}).catch(function(err) {
		if (err.noUsers) {
			// This is ok, it simply means there were no users in the agent's subscription geo location
			err.isSatisfied = false;
			var message = sprintf('-- Unable to Add any Users to Agents New Subscription with Geo: %s --', subscription.geo);
			console.log(message);
			deferred.resolve(agent);
		} else {
			console.log(err);
			deferred.reject(err);
		}
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__addNewAgent = function(context) {
	var that = this;
	var deferred = Q.defer();
	var Agents = mongoose.model('Agents');
	var agent = new Agents({
		firstName : context.firstname,
		lastName : context.lastname,
		email : context.email
	});
	Geos.fetch(context.geo).then(function(geoDoc) {
		context.county = geoDoc[0].County;
		Stripe.createAgent(agent, context).then(function(agent) {
			that.__save(agent).then(function(savedDoc) {
				console.log('-- Added New Agent to DB --');
				deferred.resolve(savedDoc);
			}).fail(function(err) {
				deferred.reject(err);
			}).done();
		}).fail(function() {
			deferred.reject("Oops! Something went wrong! Please try again...");
		}).done();
	}).fail(function(err) {
		var exeptionMessage = 'Invalid Geo Location';
		var exeptionCode = 500;
		var error = sprintf('INTERNAL ERROR: (%s) unable to find county for geo - is geo correct? geo: %s, token:%s, agent:%s', err, context.geo, context.token, doc);
		Methods.AdminEmail('admin', 'INTERNAL ERROR! Unable to Find County and add New Agent', error);
		if (err.message)
			exeptionMessage = err.message;
		if (err.code)
			exeptionCode = err.code;
		deferred.reject(Exception(exeptionMessage, exeptionCode));
	}).done();

	return deferred.promise;
};

AgentsSchema.statics.__addAgentToDB = function(context) {
	var deferred = Q.defer();
	var Agents = mongoose.model('Agents');
	var that = this;
	var agent = new Agents({
		firstName : context.firstname,
		lastName : context.lastname,
		email : context.email
	});
	if (context.customer_id)
		agent.customer_id = context.customer_id;

	that.__save(agent).then(function(savedDoc) {
		console.log('-- Added Agent to DB --');
		deferred.resolve(savedDoc);
	}).fail(function(err) {
		deferred.reject(err);
	}).done();

	return deferred.promise;
};

AgentsSchema.statics.__addNewSubscription = function(doc, context) {
	var that = this;
	var deferred = Q.defer();
	Geos.fetch(context.geo).then(function(geoDoc) {
		context.county = geoDoc[0].County;
		Stripe.createSubscription(doc, context).then(function(agent) {
			deferred.resolve(agent);
		}).fail(function(err) {
			deferred.reject(err);
		}).done();
	}).fail(function(err) {
		var exeptionMessage = 'Invalid Geo Location';
		var exeptionCode = 500;
		var error = sprintf('INTERNAL ERROR: (%s) unable to find county for geo - is geo correct? geo: %s, token:%s, agent:%s', err, context.geo, context.token, doc);
		Methods.AdminEmail('admin', 'INTERNAL ERROR! Unable to Find County', error);
		if (err.message)
			exeptionMessage = err.message;
		if (err.code)
			exeptionCode = err.code;
		deferred.reject(Exception(exeptionMessage, exeptionCode));
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__save = function(doc) {
	var deferred = Q.defer();
	var dirtyPaths = JSON.stringify(doc.$__.activePaths.states.modify);
	console.log("-- Detected Dirty Paths " + dirtyPaths + " --");
	console.log("-- **Saving Agent Document** --");
	doc.save(function(err, savedDoc) {
		if (err) {
			var error = sprintf('-- INTERNAL MONGO ERROR: Unable to Save Agent: %s --', JSON.stringify(err));
			console.log(error);
			deferred.reject(error);
		} else {
			console.log("-- Successfully Saved Agent Document --");
			deferred.resolve(savedDoc);
		}
	});
	return deferred.promise;
};

AgentsSchema.statics.__getUsersWithNoAgentByGeo = function(subscription) {
	console.log("-- Getting Users with No Assigned Agent --");
	var deferred = Q.defer();
	var candidates = [];
	var err = {};
	var Users = mongoose.model('Users');
	var that = this;
	Users.findNoAgentUsers().then(function(users) {
		console.log(sprintf("-- Successfully Got %d Users with No Assigned Agents --", users.length));
		console.log(sprintf("-- Trying to find users at CITY level: %s", subscription.geo));
		for (var i = 0; i < users.length; i++) {
			var found = that.__queryUserWithNoAgentByGeo(subscription, users[i]);
			if (found)
				candidates.push(found);
		}
		if (candidates.length === 0) {
			console.log(sprintf("-- Unable to find users on CITY level - Trying to find users at COUNTY level: %s", subscription.county));
			for (var i = 0; i < users.length; i++) {
				var found = that.__queryUserWithNoAgentByGeo(subscription, users[i], true);
				if (found)
					candidates.push(found);
			}
		} else
			console.log(sprintf("-- Found %d users at CITY level --", candidates.length));
		if (candidates.length === 0) {
			err.noUsers = true;
			err.message = 'No Users in this Geo (or at County level)';
			console.log("-- " + err.message + " --");
			deferred.reject(err);
		} else {
			console.log(sprintf("-- Found %d users at COUNTY level --", candidates.length));
			deferred.resolve(candidates);
		}
	}).fail(function(err) {
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__queryUserWithNoAgentByGeo = function(subscription, user, tryCounty) {
	if (tryCounty) {
		var county = subscription.county.toLowerCase();
		for (var i = 0; i < user.search.length; i++) {
			var search = user.search[i];
			var searchGeoCounty = search.county.toLowerCase();
			if (searchGeoCounty == county)
				return user;
		}
	} else {
		var geo = subscription.geo.toLowerCase().replace(/-/g, ' ');
		for (var i = 0; i < user.search.length; i++) {
			var search = user.search[i];
			var searchGeo = search.geo.toLowerCase().replace(/-/g, ' ');
			if (searchGeo == geo)
				return user;
		}
	}

	return null;
};

// for each user in the geo with no agent, we add to the new subscription
AgentsSchema.statics.__addUsersToNewSubscription = function(users, agent) {
	console.log("-- Begin Adding Users to Agents New Subscription --");
	// for each user in the geo with no agent, we add to the new subscription
	var deferred = Q.defer();
	var message = null;
	var Users = mongoose.model('Users');
	var idx = agent.subscriptions.length - 1;
	for (var i = 0; i < users.length; i++) {
		var payload = {};
		payload.action = "SatisfyNewSub";
		var user = payload.user = users[i];
		payload.geo = agent.subscriptions[idx].geo;
		agent.subscriptions[idx].satisfy--;
		agent.subscriptions[idx].history.leads.push({
			date : (new Date()).getTime(),
			email : user.email
		});
		Users.assignAgent(user, agent.id);
		this.__sendNotificationEmail(agent, payload, false);
		if (agent.subscriptions[idx].satisfy === 0)
			break;
	}
	if (agent.subscriptions[idx].satisfy === 0) {
		message = sprintf('-- Agent (%s) has been fully Satisfied for the current billing cycle. --', agent.email);
	}
	this.__save(agent).then(function(savedDoc) {
		console.log('-- Successfully Added Leads To Agent --');
		if (message !== null) {
			console.log(message);
			Methods.AdminEmail('agent', 'Satisfied Agent!', message);
		}
		deferred.resolve(savedDoc);
	}).fail(function(err) {
		deferred.reject(err);
	}).done();

	return deferred.promise;
};
// ***************************************

AgentsSchema.statics.__getAllAgentsByGeo = function(agents, geo, onlyEnabledSubs) {
	var candidates = [];
	for (var p = 0; p < agents.length; p++) {
		var subs = [];
		var agent = agents[p];
		for (var l = 0; l < agent.subscriptions.length; l++) {
			var subscription = agent.subscriptions[l];
			if (onlyEnabledSubs) {
				if (subscription.enabled === false)
					continue;
			}
			if (subscription.geo.toLowerCase() === geo.toLowerCase())
				subs.push(subscription);
		}
		candidates.push({
			agent : agent,
			subscriptions : subs
		});
	}
	return candidates;
};

AgentsSchema.statics.__contact = function(payload) {
	var deferred = Q.defer();
	console.log('-- Begining Attemp to Contact Agent --');
	// we just got a user signing into this geo (given email) - we need to find an agent in the area that has it - else expand search
	var that = this;
	this.findAgent().then(function(agents) {
		console.log('-- Querying all Agents subscriptions --');
		// before we try to satisfy the agent - we first need to see if this agent *already* knows about this buyer
		var agent = that.__querySubscription(agents, payload.email);
		if (agent !== null) {
			var agentMsg = sprintf('-- Agent %s (%s) was Found in the Query for this User --', agent.firstName, agent.email);
			console.log(agentMsg);
			that.__sendNotificationEmail(agent, payload, false).then(function(agentMessage) {
				deferred.resolve(agentMessage);
			}).fail(function(err) {
				deferred.reject(err);
			}).done();
		} else {
			console.log('-- No Agent found for this user --');
			// guess we haven't found an existing agent who has this email - in this case - we need to satisfy!!
			that.__satisfySubscription(agents, payload).then(function(agentSub) {
				that.__sendNotificationEmail(agentSub, payload, true).then(function(agentMessage) {
					deferred.resolve(agentMessage);
				});
			}).catch(function(err) {
				deferred.reject(err);
			}).done();
		}
	}).fail(function(err) {
		if (err.message)
			console.log(err.message);
		if (payload) {
			err.noAgent = true;
			err.payload = _.clone(payload);
		}
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__preparePayload = function(payload) {
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
	return payload;
};

AgentsSchema.statics.__addUserDetails = function(err, payload) {
	err.message = err.message + '\n UNABLE TO ASSIGN LEAD TO ANY AGENT!\n';
	var userDetails = sprintf('Lead Details >>> Email: %s, Geo: %s.\n', payload.email, payload.geo);
	err.message = err.message + userDetails;
	if (payload.action) {
		if (payload.action == "MainBuyForLess" || payload.action == "MainSellForMore") {
			userDetails = sprintf('Additional Lead Details >>> Name: %s, Interest: %s, Message: %s', payload.name, payload.interest, payload.message);
			err.message = err.message + userDetails;
		}
	}
};

AgentsSchema.statics.__querySubscription = function(agents, email) {
	// for each agent, we check if any agent is associated with the email
	for (var i = 0; i < agents.length; i++) {
		var agent = agents[i];
		for (var j = 0; j < agent.subscriptions.length; j++) {
			var subscription = agent.subscriptions[j];
			if (subscription.enabled === false)
				continue;
			var leadHistory = subscription.history.leads;
			for (var k = 0; k < leadHistory.length; k++) {
				if (leadHistory[k].email == email)
					return agent;
			}
		}
	}
	return null;
};

AgentsSchema.statics.__satisfySubscription = function(agents, payload) {
	var deferred = Q.defer();
	var that = this;
	this.__findAgentLead(agents, payload).then(function(agentSub) {
		that.__satisfyAgent(agentSub, payload).then(function(savedDoc) {
			deferred.resolve(agentSub);
		}).fail(function(err) {
			deferred.reject(err);
		}).done();
	}).fail(function(err) {
		console.log(err);
		var error = {};
		error.message = err;
		if (payload) {
			error.noAgent = true;
			error.payload = _.clone(payload);
		}
		deferred.reject(error);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__satisfyAgent = function(agentSub, payload) {
	var deferred = Q.defer();
	var subscription = agentSub.subscription;
	subscription.satisfy = subscription.satisfy - 1;
	subscription.history.leads.push({
		date : (new Date()).getTime(),
		email : payload.email
	});
	var message = null;
	if (subscription.satisfy === 0)
		message = sprintf('-- Agent (%s) has been fully Satisfied for the current billing cycle. --', agentSub.agent.email);
	this.__save(agentSub.agent).then(function(savedDoc) {
		if (message !== null) {
			console.log(message);
			Methods.AdminEmail('agent', 'Satisfied Agent!', message);
		}
		deferred.resolve(savedDoc);
	}).fail(function(err) {
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__sendNotificationEmail = function(agentSub, payload, newUser) {
	console.log('-- Sending Agent Notification --');
	var deferred = Q.defer();

	var agent = agentSub;
	var subscription = null;
	if (agentSub.agent)
		agent = agentSub.agent;
	if (agentSub.subscription)
		subscription = agentSub.subscription;

	var that = this;
	console.log('-- Getting Agent Email Context --');
	this.__getAgentEmailContext(agent, subscription, payload, newUser).then(function(agentEmail) {
		console.log('-- Successfully Got Agent Email Context --');
		Methods.Email("agent@truzip.com", agentEmail.to, agentEmail.subject, agentEmail.text, agentEmail.attachments).then(function(agentMessage) {
			agentMessage.agentID = agent.id;
			deferred.resolve(agentMessage);
		}).fail(function(err) {
			deferred.reject(err);
		}).done();
	}).fail(function(err) {
		console.log('-- Failed To Get Agent Email Context --');
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__findAgentLead = function(agents, payload) {
	// first let's get more info on this geo (such as city (if zip passed) and county name)
	var that = this;
	var deferred = Q.defer();
	if (payload.multiSelect) {
		var promises = [],
		    candidates = [];
		var selectedGeos = payload.interest;
		if (selectedGeos == undefined)
			selectedGeos = this.__breakSelectedCities(payload);
		for (var d = 0; d < selectedGeos.length; d++) {
			var promise = this.__getAgentCandidates(agents, selectedGeos[d]);
			promises.push(promise);
		}
		Q.allSettled(promises).then(function(results) {
			results.forEach(function(result) {
				if (result.state === 'fulfilled')
					deferred.resolve(result.value);
			});
			var err = {};
			err.message = sprintf('No Agents in ANY of the selected Geos: %s', payload.multiInterest);
			console.log("-- " + err.message + " --");
			deferred.reject(err);
		}).done();
	} else {
		this.__getAgentCandidates(agents, payload.geo).then(function(candidate) {
			deferred.resolve(candidate);
		}).fail(function(err) {
			deferred.reject(err);
		}).done();
	}
	return deferred.promise;
};

AgentsSchema.statics.__breakSelectedCities = function(payload) {
	var multiInterest = payload.multiInterest,
	    split1,
	    split2;
	if (multiInterest.indexOf(', ') > -1) {
		// then theres 3
		split1 = multiInterest.split(', ');
		if (split1[1].indexOf(' and ') > -1)
			split2 = split1[1].split(' and ');
		split2.push(split1[0]);
		return split2;
	} else if (multiInterest.indexOf(' and ') > -1) {
		// then theres only 2
		split1 = multiInterest.split(' and ');
		return split1;
	}
};

AgentsSchema.statics.__getAgentCandidates = function(agents, geo) {
	// first let's get more info on this geo (such as city (if zip passed) and county name)
	var that = this;
	var deferred = Q.defer();
	Geos.fetch(geo).then(function(geoDoc) {
		if (geoDoc.length === 0)
			deferred.reject();
		else {
			var county = geoDoc[0].County.toLowerCase();
			var city = geoDoc[0].City.toLowerCase();
			var candidate = that.__findAvailableAgent(agents, city, county);
			if (candidate === null) {
				var msg = sprintf('WARNING: Unable to Find Available Agent in the %s with the Given City of %s.', county, city);
				deferred.reject(msg);
			} else
				deferred.resolve(candidate);
		}
	}).fail(function(err) {
		var msg = sprintf('WARNING: No Agents Found for Geo: %s.', geo);
		deferred.reject(msg);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__findAvailableAgent = function(agents, city, county, tryCountyLevel) {
	var candidates = [];
	for (var i = 0; i < agents.length; i++) {
		var agent = agents[i];
		for (var j = 0; j < agent.subscriptions.length; j++) {
			var subscription = agent.subscriptions[j];
			if (subscription.enabled === false)
				continue;
			if (subscription.geo.toLowerCase() == city || (tryCountyLevel && subscription.county.toLowerCase() == county)) {
				// has this agent been satisfied? - if not - he's a candidate
				if (subscription.satisfy > 0) {
					var agentSub = {};
					agentSub.agent = agent;
					agentSub.subscription = subscription;
					candidates.push(agentSub);
				}
			}
		}
	}
	var found = null;
	if (candidates.length === 0) {
		// if not found - try one more time - this time on county level
		if (tryCountyLevel === undefined)
			found = this.__findAvailableAgent(agents, city, county, true);
	} else {
		// get a candidate that has the least amount of subscriptions
		found = candidates[0];
		var satisfactionRatio = this.__getSatisfactionRatio(found);
		for (var i = 1; i < candidates.length; i++) {
			var candidate = candidates[i];
			// get the agent lead that really needs to be satisfied (small ratio of currently satisfied)
			var ratio = this.__getSatisfactionRatio(candidate);
			if (ratio < satisfactionRatio) {
				satisfactionRatio = ratio;
				found = candidate;
			}
		}
	}
	return found;
};

AgentsSchema.statics.__getSatisfactionRatio = function(candidate) {
	// when it's fully satisfied - the ratio will be 0 - so invert to 1 or 100% if fully satisfied
	var ratio = candidate.subscription.satisfy / candidate.subscription.qty;
	return 1 - ratio;
};

AgentsSchema.statics.__validateContext = function(context) {
	// coming from client: context.leads is the value of number of leads the agent requested
	if (context.leads == undefined || context.leads.length == 0 || context.leads.length == '0')
		return false;
	return true;
};

AgentsSchema.statics.__update = function(update) {
	var deferred = Q.defer();
	var that = this;
	this.findOne({
		'_id' : update.id
	}, function(err, doc) {
		if (err) {
			var error = {};
			error.client = _.clone(err);
			error.message = sprintf('-- INTERNAL ERROR - MONGO Update Error Name and Code: %s (%d): Unable to Find Agent With Supplied Id: %s --', err.name, err.code, err);
			console.log(error.message);
			deferred.reject(error);
		} else {
			doc.merge(update);
			that.__save(doc).then(function(savedDoc) {
				deferred.resolve(savedDoc);
			}).fail(function(err) {
				deferred.reject(err);
			}).done();
		}
	});
	return deferred.promise;
};

AgentsSchema.statics.__getAgentEmailContext = function(agent, subscription, payload, newUser) {
	var deferred = Q.defer();
	var that = this;
	if (payload.action === "UserSignIn" && newUser === false) {
		var msg = 'Returning User With Deleted Cookie OR Visiting From New Browser';
		console.log('-- ' + msg + ' --');
		var errMsg = {};
		errMsg.action = payload.action;
		errMsg.newUser = newUser;
		errMsg.message = msg;
		errMsg.emailNotNeeded = true;
		deferred.reject(errMsg);
	} else {
		var bind = {};
		if (payload.action === "SatisfyNewSub" && newUser === false) {
			var msg = 'Satisfying New Subscription with Existing User';
			console.log('-- ' + msg + ' --');
			var user = bind.user = payload.user;
			bind.email = user.email;
			bind.city = user.search[user.search.length - 1].geo.toLowerCase().replace(/-/g, ' ');
			bind.agentName = agent.firstName;
			if (payload.message)
				bind.message = payload.message;
			if (subscription != null)
				bind.leadsLeft = subscription.satisfy.toString();
			bind.multiSelect = payload.multiSelect || false;
			bind.multiInterest = payload.multiInterest || null;
		} else if (payload.action == "PropertyContactAgent") {
			bind = _.clone(payload);
			bind.agentName = agent.firstName;
		} else if (payload.action === "AgentSignUp" && newUser === true) {
			bind.email = payload.metadata.email;
			bind.geo = payload.metadata.geo;
			bind.plan_id = payload.plan.id;
			bind.subscription_id = payload.id;
			if (bind.subscription_id.indexOf('sub_') > -1)
				bind.subscription_id = bind.subscription_id.replace('sub_', '');
			bind.customer_id = payload.customer;
			if (bind.customer_id.indexOf('cus_') > -1)
				bind.customer_id = bind.customer_id.replace('cus_', '');
			bind.firstName = payload.metadata.firstName;
			bind.lastName = payload.metadata.lastName;
			bind.numOfLeads = payload.metadata.number_of_leads;
			bind.price = this.__stringifyPennyValue(1, payload.plan.amount);
			bind.chargePerLead = this.__currencyToNumber(bind.price) / parseInt(bind.numOfLeads);
			bind.billing_address_line1 = payload.metadata.billing_address_line1;
			bind.billing_address_city = payload.metadata.billing_address_city;
			bind.billing_address_state = payload.metadata.billing_address_state;
			bind.billing_address_zip = payload.metadata.billing_address_zip;
			bind.billing_address_country_code = payload.metadata.billing_address_country_code;
			bind.card_brand = payload.metadata.card_brand;
			bind.card_last4 = payload.metadata.card_last4;
			bind.startDateString = payload.startDateString;
			bind.endDateString = payload.endDateString;
			bind.startingBillingCycle = this.__getBillingCycleDate(bind.startDateString);
			bind.endingBillingCycle = this.__getBillingCycleDate(bind.endDateString);
		} else {
			bind.email = payload.email;
			bind.city = payload.geo;
			bind.agentName = agent.firstName;
			if (payload.message)
				bind.message = payload.message;
			if (subscription != null)
				bind.leadsLeft = subscription.satisfy.toString();
			bind.multiSelect = payload.multiSelect || false;
			bind.multiInterest = payload.multiInterest || null;
		}
		bind.action = payload.action;
		bind.newUser = newUser;
		bind.to = agent.email || bind.email;

		EmailTemplate.getAgentEmailTemplate(bind).then(function(context) {
			deferred.resolve(context);
		}).fail(function(err) {
			console.log(err);
			deferred.reject(err);
		}).done();
	}

	return deferred.promise;
};

AgentsSchema.statics.__handleWebhook = function(action, payload) {
	console.log('-- Handleling Webhook: ' + action + ' --');
	var deferred = Q.defer();
	switch (action) {
	case "invoice.created":
	case "invoice.payment_failed":
	case "invoice.payment_succeeded":
		this.__handleInvoiceWebhook(action, payload).then(function(agent) {
			deferred.resolve(agent);
		}).fail(function(err) {
			deferred.reject(err);
		}).done();
		break;
	case "customer.subscription.deleted":
		this.__handleSubscriptionDeletedWebhook(action, payload).then(function(agent) {
			deferred.resolve(agent);
		}).fail(function(err) {
			deferred.reject(err);
		}).done();
		break;
	default:
		var errorMsg = config.options.errorMessages.unhandledWebhook;
		var msg = sprintf(errorMsg, action);
		deferred.reject(msg);
	}
	return deferred.promise;
};

AgentsSchema.statics.__handleInvoiceWebhook = function(action, payload) {
	var deferred = Q.defer();
	var conditions = {
		customer_id : payload.customer
	};
	var that = this;
	this.findAgent(conditions).then(function(agent) {
		that.__updateInvoice(agent[0], payload).then(function(context) {
			if (action == "invoice.created") {
				that.__save(context.agent).then(function(savedDoc) {
					deferred.resolve(savedDoc);
				}).fail(function(err) {
					deferred.reject(err);
				}).done();
			} else {
				that.__updateSubscriptionStatus(action, context).then(function(subscription) {
					that.__save(context.agent).then(function(savedDoc) {
						deferred.resolve(savedDoc);
					}).fail(function(err) {
						deferred.reject(err);
					}).done();
				}).fail(function(err) {
					deferred.reject(err);
				}).done();
			}
		}).fail(function(err) {
			deferred.reject(err);
		});
	}).fail(function(err) {
		var error = sprintf('WEBHOOK ERROR: Unable to find associated Agent with Stripe Customer ID: %s', payload.customer);
		deferred.reject(error);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__updateInvoice = function(agent, payload) {
	var deferred = Q.defer();
	var context = {};
	var subscription = context.subscription = _.findWhere(agent.subscriptions, {
		subscription_id : payload.subscription
	});
	// we first find the Invoice
	var invoice = this.__queryInvoice(agent, payload.subscription, payload.id);
	if (invoice != null) {
		invoice.attempted = payload.attempted;
		invoice.closed = payload.closed;
		invoice.paid = payload.paid;
		invoice.date = payload.date;
	} else {
		// agent's subscription does not yet have an invoice
		invoice = {
			invoice_id : payload.id,
			attempted : payload.attempted,
			closed : payload.closed,
			paid : payload.paid,
			date : payload.date
		};
		if (subscription) {
			if (subscription.history.invoices.length == 0) {
				subscription.history.invoices = [invoice];
			} else
				subscription.history.invoices.push(invoice);
		} else {
			var errorMsg = config.options.errorMessages.findingInvoice;
			var error = sprintf(errorMsg, payload.subscription, payload.id);
			deferred.reject(error);
		}
	}
	context.agent = agent;
	context.invoice = invoice;
	deferred.resolve(context);
	return deferred.promise;
};

AgentsSchema.statics.__queryInvoice = function(agent, subscription_id, invoice_id) {
	for (var i = 0; i < agent.subscriptions.length; i++) {
		var subscription = agent.subscriptions[i];
		if (subscription.subscription_id != subscription_id)
			continue;
		var invoiceHistory = subscription.history.invoices;
		if (invoiceHistory.length > 0) {
			for (var q = 0; q < invoiceHistory.length; q++) {
				var invoice = invoiceHistory[q];
				if (invoice.invoice_id == invoice_id)
					return invoice;
			}
		}
	}
	return null;
};

AgentsSchema.statics.__updateSubscriptionStatus = function(action, context) {
	var deferred = Q.defer();
	if (!context.subscription) {
		var rjtMsg = 'There is no Subscription to disable!';
		console.log('-- ' + rjtMsg + ' --');
		deferred.reject(rjtMsg);
	}
	var newStatus = true;
	if (action == "invoice.payment_failed" || action == "customer.subscription.deleted")
		newStatus = false;
	context.subscription.enabled = newStatus;
	deferred.resolve(context.subscription);
	return deferred.promise;
};

AgentsSchema.statics.__handleSubscriptionDeletedWebhook = function(action, payload) {
	var deferred = Q.defer();
	var context = {};
	var conditions = {
		customer_id : payload.customer
	};
	var that = this;
	this.findAgent(conditions).then(function(agent) {
		context.agent = agent[0];
		context.subscription = _.findWhere(context.agent.subscriptions, {
			subscription_id : payload.id
		});
		that.__updateSubscriptionStatus(action, context).then(function(subscription) {
			that.__save(context.agent).then(function(savedDoc) {
				var message = sprintf('-- Subscription Cancellation Confirmed - Agent (%s) cancelled subscription. --', context.agent.email);
				console.log(message);
				Methods.AdminEmail('cancel', 'Subscription Cancelled!', message);
				deferred.resolve(savedDoc);
			}).fail(function(err) {
				deferred.reject(err);
			}).done();
		}).fail(function(err) {
			deferred.reject(err);
		}).done();
	}).fail(function(err) {
		var error = sprintf('WEBHOOK ERROR: Unable to find associated Agent with Stripe Customer ID: %s', payload.customer);
		deferred.reject(error);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__handleSendAdsReport = function() {
	var deferred = Q.defer();
	var that = this;
	var report = 'Seems that we do not have any Agents in our DB or No Agents with Active subscriptions or need satisfaction at this time!';
	this.findAgent().then(function(agents) {
		var reportData = that.__getReportData(agents);
		if (reportData.length === 0) {
			Methods.AdminEmail('admin', 'Daily Agent Ads Report', report, true);
			deferred.resolve(report);
		}
		that.__getAdsReportEmailContext(reportData).then(function(context) {
			report = context.text;
			Methods.AdminEmail('admin', 'Daily Agent Ads Report', report, true);
			deferred.resolve(report);
		}).fail(function(err) {
			deferred.reject(err);
		}).done();
	}).fail(function(err) {
		if (err.message && err.message.indexOf("No Agents from DB") > -1) {
			Methods.AdminEmail('admin', 'Daily Agent Ads Report', report, true);
			deferred.resolve(report);
		}
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__getReportData = function(agents) {
	var reportData = [],
	    numOfAgents = agents.length,
	    agent,
	    numOfSubs,
	    agentSubs,
	    sub,
	    e,
	    v;
	for ( e = 0; e < numOfAgents; e++) {
		agentSubs = [];
		agent = agents[e];
		numOfSubs = agent.subscriptions.length;
		for ( v = 0; v < numOfSubs; v++) {
			sub = agent.subscriptions[v];
			if (sub.enabled === false)
				continue;
			agentSubs.push({
				Subscription_Qty : sub.qty,
				Subscription_Satisfy : sub.satisfy,
				Subscription_Geo : sub.geo,
				Subscription_County : sub.county
			});
		}
		reportData.push({
			Agent_First_Name : agent.firstName,
			Agent_Email : agent.email,
			Subscriptions : agentSubs
		});
	}
	return reportData;
};

AgentsSchema.statics.__getAdsReportEmailContext = function(data) {
	var deferred = Q.defer();
	var bind = {};
	bind.agents = data;
	EmailTemplate.getAdminEmailTemplate(bind).then(function(context) {
		deferred.resolve(context);
	}).fail(function(err) {
		console.log(err);
		deferred.reject(err);
	}).done();
	return deferred.promise;
};

AgentsSchema.statics.__currencyToNumber = function(val) {
	val = val.replace('$', '');
	return parseInt(val);
};

AgentsSchema.statics.__stringifyPennyValue = function(qty, pennies) {
	if ( typeof qty == 'string')
		qty = parseInt(qty);
	if ( typeof pennies == 'string')
		pennies = parseInt(pennies);
	var fullAmnt = (pennies * qty) / 100;
	fullAmnt = fullAmnt.toString();
	if (fullAmnt.indexOf('.') > -1) {
		var fullAmntSplit = fullAmnt.split('.');
		if (fullAmntSplit[1].length == 1) {
			var cents = parseInt(fullAmntSplit[1]);
			if (cents < 9)
				fullAmntSplit[1] = '0' + cents.toString();
		} else if (fullAmntSplit[1].length > 2)
			fullAmntSplit[1] = fullAmntSplit[1].slice(0, 1);
		fullAmnt = fullAmntSplit[0] + '.' + fullAmntSplit[1];
	} else
		fullAmnt = fullAmnt + '.00';
	return '$' + fullAmnt;
};

AgentsSchema.statics.__getBillingCycleDate = function(string) {
	if (string.indexOf(', ') > -1) {
		var stringSplit = string.split(', ');
		return stringSplit[1];
	} else
		return string;
};

module.exports = mongoose.model('Agents', AgentsSchema);
