var Q = require("q");
var config = require("../../config.json");
var Moment = require('moment');
var sprintf = require("sprintf-js").sprintf;
var Exception = require('../utils').Exception;
var stripeConfig = config.stripe[config.stripe.mode];
var Stripe = require("stripe")(stripeConfig.keys.secret_key);

module.exports = {
	createAgent : function(agent, context) {
		var deferred = Q.defer();
		if (!this.__validateContext(context))
			deferred.reject('Context is Not Valid');
		var that = this;
		var description = 'Agent Leads for: ' + agent.email;
		var number_of_leads = parseInt(context.leads);
		var charge_per_lead = config.options.charges.per_lead;
		var account_balance = charge_per_lead * number_of_leads;
		// Stripe allows to add new customers to subscriptions in the same call
		var plan = this.getPlanName(number_of_leads);
		Stripe.customers.create({
			description : description,
			source : context.token,
			email : agent.email,
			plan : plan,
			metadata : {
				geo : context.geo,
				email : context.email,
				number_of_leads : number_of_leads,
				firstName : agent.firstName,
				lastName : agent.lastName,
				billing_address_line1 : context.billing_address_line1,
				billing_address_city : context.billing_address_city,
				billing_address_state : context.billing_address_state,
				billing_address_zip : context.billing_address_zip,
				billing_address_country_code : context.billing_address_country_code,
				card_brand : context.card_brand,
				card_last4 : context.card_last4
			}
		}).then(function(customer) {
			// create new agent with subscription
			var subscription_data = customer.subscriptions.data[0];
			var metadata = customer.metadata;
			agent.subscriptions = [{
				subscription_id : subscription_data.id,
				enabled : true,
				token : context.token,
				signedUp : (new Date()).getTime(),
				geo : context.geo,
				county : context.county,
				qty : parseInt(context.leads),
				satisfy : parseInt(context.leads)
			}];
			agent.customer_id = customer.id;
			deferred.resolve(agent);
		}, function(err) {
			console.log('Stripe Error - Agent Creation: ' + err);
			deferred.reject(err);
		});
		return deferred.promise;
	},
	createSubscription : function(doc, context) {
		var deferred = Q.defer();
		if (!this.__validateContext(context))
			deferred.reject('Context is Not Valid');
		var that = this;
		var number_of_leads = parseInt(context.leads);
		var customerId = doc.customer_id || doc.id;
		// Create a new subscription on the existing customer (aka Agent)
		var plan = this.getPlanName(number_of_leads);
		Stripe.customers.createSubscription(customerId, {
			source : context.token,
			plan : plan,
			metadata : {
				geo : context.geo,
				email : context.email,
				number_of_leads : number_of_leads,
				firstName : doc.firstName,
				lastName : doc.lastName,
				billing_address_line1 : context.billing_address_line1,
				billing_address_city : context.billing_address_city,
				billing_address_state : context.billing_address_state,
				billing_address_zip : context.billing_address_zip,
				billing_address_country_code : context.billing_address_country_code,
				card_brand : context.card_brand,
				card_last4 : context.card_last4
			}
		}).then(function(subscription) {
			doc.subscriptions.push({
				subscription_id : subscription.id,
				enabled : true,
				token : context.token,
				signedUp : (new Date()).getTime(),
				geo : context.geo,
				county : context.county,
				qty : parseInt(context.leads),
				satisfy : parseInt(context.leads)
			});
			deferred.resolve(doc);
		}, function(err) {
			console.log('Stripe Error - Adding Subscription to Agent: ' + err);
			that.__handleStripeError(err);
			deferred.reject(err);
		});
		return deferred.promise;
	},
	getPlanName : function(quantity) {
		return stripeConfig.subscription.plan_name + '-' + quantity;
	},
	getAgentById : function(agentId) {
		var deferred = Q.defer();
		Stripe.customers.retrieve(agentId, function(err, agent) {
			if (!err)
				deferred.resolve(agent);
			else
				deferred.reject(err);
		});
		return deferred.promise;
	},
	getSubscriptionById : function(agentId, subId) {
		var deferred = Q.defer();
		var that = this;
		Stripe.customers.retrieveSubscription(agentId, subId, function(err, sub) {
			if (!err) {
				if (sub.start)
					that.__convertTimestamp(sub);
				deferred.resolve(sub);
			} else
				deferred.reject(err);
		});
		return deferred.promise;
	},
	findAgent : function(conditions, options) {
		var deferred = Q.defer();
		var that = this;
		if (options === undefined) {
			options = {
				limit : 50
			};
		}
		// asynchronously called
		Stripe.customers.list(options, function(err, customers) {
			var agent = that.__queryAgent(conditions, customers.data);
			if (agent)
				deferred.resolve(agent);
			else
				deferred.reject('Agent does not exists as a customer in Stripe.');
		});
		return deferred.promise;
	},
	__validateContext : function(context) {
		// coming from client: context.leads is the value of number of leads the agent requested
		if (context.leads == undefined || context.leads.length == 0 || context.leads.length == '0')
			return false;
		return true;
	},
	__convertTimestamp : function(sub) {
		var DateFormat = "dddd, MMMM Do YYYY";
		var TimestampFormat = "YYYY MM DD";
		// Stringify Starting Date
		var timestamp = sub.current_period_start;
		timestamp = Moment.unix(timestamp);
		var d = timestamp.get('date');
		d = d.toString();
		var m = timestamp.get('month') + 1;
		m = m.toString();
		if (m.length == 1)
			m = "0" + m;
		var y = timestamp.get('year');
		y = y.toString();
		timestamp = y + ' ' + m + ' ' + d;
		sub.startDateString = Moment(timestamp, TimestampFormat).format(DateFormat);
		// Stringify Ending Date
		timestamp = sub.current_period_end;
		timestamp = Moment.unix(timestamp);
		d = timestamp.get('date');
		d = d.toString();
		m = timestamp.get('month') + 1;
		m = m.toString();
		if (m.length == 1)
			m = "0" + m;
		y = timestamp.get('year');
		y = y.toString();
		timestamp = y + ' ' + m + ' ' + d;
		sub.endDateString = Moment(timestamp, TimestampFormat).format(DateFormat);
	},
	__handleStripeError : function(err) {
		switch (err.type) {
		case 'StripeCardError':
			// A declined card error
			//err.message// => e.g. "Your card's expiration year is invalid."
			break;
		case 'RateLimitError':
			// Too many requests made to the API too quickly
			break;
		case 'StripeInvalidRequestError':
			// Invalid parameters were supplied to Stripe's API
			if (err.message.indexOf("the maximum 25 current subscriptions") > -1) {
				err.message = "You have reached the maximum of 25 active subscriptions! You were not charged for this transaction!";
				err.title = "Maximum Limit Reached";
			}
			if (err.message.indexOf("No such customer:") > -1)
				err.title = "Customer Does Not Exists";
			break;
		case 'StripeAPIError':
			// An error occurred internally with Stripe's API
			break;
		case 'StripeConnectionError':
			// Some kind of error occurred during the HTTPS communication
			break;
		case 'StripeAuthenticationError':
			// You probably used an incorrect API key
			break;
		default:
			// Handle any other types of unexpected errors
			break;
		}
	},
	__queryAgent : function(conditions, agents) {
		if (agents.length === 0)
			return null;
		var agent = null;
		for (var r = 0; r < agents.length; r++) {
			agent = this.__isAgentCustomer(conditions, agents[r]);
			if (agent)
				return agent;
		}
		return null;
	},
	__isAgentCustomer : function(conditions, agent) {
		for (var key in conditions) {
			if (conditions.hasOwnProperty(key)) {
				if (agent[key] === undefined)
					continue;
				if (agent[key] === conditions[key])
					return agent;
			}
		}
		return null;
	}
};
