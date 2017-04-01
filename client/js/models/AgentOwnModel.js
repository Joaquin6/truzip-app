define(['jquery', 'underscore', 'backbone', 'sprintf', 'router', 'utility'], function($, _, Backbone, nopSprintf, Router, Utility) {
	return Backbone.Model.extend({
		__checkoutHandler : null,
		__callback : null,
		url : '/agents',
		initialize : function() {
			_.bindAll(this, '__onTokenResponce');
			var that = this;
			$.ajax({
				url : '/agents/checkoutconfigs',
				type : 'POST',
				success : function(data, status) {
					if (data == null || data == undefined)
						return;
					that.set('chargePerLead', data.chargePerLead);
					that.set('total_plans', data.total_plans);
				//	that.__setupStripeCheckout(data.key);
					that.__callback(that);
				}
			});
		},
		onInitialized : function(callback) {
			this.__callback = callback;
		},
		openCheckout : function(context, callback) {
			if (context) {
				if (context.cities != undefined)
					this.set('cities', context.cities);
				if (context.numOfLeads != undefined)
					this.set('numOfLeads', context.numOfLeads);
				if (context.email != undefined)
					this.set('email', context.email);

				// Handle Cities
				var description = 'No Cities Were Selected';
				if (context.cities && context.cities.length > 0 && context.numOfLeads > 1)
					description = context.cities + ', CA - ' + context.numOfLeads + ' Leads';
				else if (context.cities && context.cities.length > 0 && context.numOfLeads == 1)
					description = context.cities + ', CA - ' + context.numOfLeads + ' Lead';
				this.set('description', description);

				// Handle Total Charging
				var chargePerLead = this.get('chargePerLead');
				if (isNaN(context.numOfLeads))
					context.numOfLeads = parseInt(context.numOfLeads);
				var amount = context.numOfLeads * chargePerLead;
				this.set('amount', amount);

				this.__openCheckout(callback);
			}
		},
		closeCheckout : function() {
			if (this.getResponse())
				this.__checkoutHandler.close();
		},
		getResponse : function() {
			return this.get('response');
		},
		getCheckoutState : function() {
			return this.get('checkout');
		},
		contactSales : function(email, message, callback) {
			var payload = {};
			payload.subject = "From Agent Contact Sales";
			payload.text = sprintf("agent: %s, sent this message: %s", email, message);

			Utility.contactAdmin(payload).then(function(data) {
				callback(data);
			}).fail(function(error) {
				callback(error);
			}).done();
		},
		__setupStripeCheckout : function(key) {
			var that = this;
			var checkoutHandler = StripeCheckout.configure({
				key : key, // test published key (stripe)
				image : 'images/favicon.ico',
				allowRememberMe : true,
				zipCode : true,
				billingAddress : true,
				locale : 'auto',
				token : that.__onTokenResponce
			});
			this.__checkoutHandler = checkoutHandler;
		},
		__onTokenResponce : function(token, args) {
			var that = this;
			var data = {};
			data.token = token.id;
			data.email = token.email;
			data.type = token.type;
			data.gateway = 'stripe';
			data.ip_address = token.client_ip;
			data.geo = this.get('cities');
			var leads = this.get('numOfLeads');
			data.leads = parseInt(leads);
			// Use the token to create the charge with a server-side script.
			if (args) {
				if (args.billing_name) {
					if (args.billing_name.indexOf(' ') > -1) {
						var nameSplit = args.billing_name.split(' ');
						data.firstname = nameSplit[0];
						data.lastname = nameSplit[1];
					} else {
						data.firstname = args.billing_name;
						data.lastname = '';
					}
				}
				data.billing_address_line1 = args.billing_address_line1;
				data.billing_address_city = args.billing_address_city;
				data.billing_address_state = args.billing_address_state;
				data.billing_address_zip = args.billing_address_zip;
				data.billing_address_country_code = args.billing_address_country_code;
			}
			data.card_tmp_token = token.card.id;
			data.card_exp_month = token.card.exp_month;
			data.card_exp_year = token.card.exp_year;
			data.card_brand = token.card.brand;
			data.card_last4 = token.card.last4;
			$.ajax({
				url : '/agents/add',
				type : 'POST',
				data : data,
				success : function(data, status) {
					that.set('response', data);
					var i = data.subscriptions.length - 1;
					var agentId = data.customer_id;
					var subId = data.subscriptions[i].subscription_id;
					that.__redirectConfirmation(agentId, subId);
				},
				error : function(err, status) {
					err.title = err.statusText;
					err.message = 'There was an internal server error! ' + 'You were not charged for this transaction. ' + 'Truzip admin and IT personel have been contacted about this issue! ' + 'Sorry for any inconvinience! Please try again later.';
					that.set('response', err);
					//that.__contactAdmin();
				},
				complete : function(xhr, status) {
					that.closeCheckout();
				},
				timeout : 3600000 //<=== set this for debugging on node , so we don't get multiple calls...when in debugger
			});
		},
		__openCheckout : function(callback) {
			var handler = this.__checkoutHandler;
			if (callback)
				callback(handler);
			else {
				var options = {
					name : this.get('companyName'),
					description : this.get('description'),
					amount : this.get('amount'),
					email : this.get('email')
				};
				handler.open(options);
			}
		},
		__redirectConfirmation : function(agentId, subId) {
			// "cus_h283849jjfnu3" => "h283849jjfnu3"
			agentId = Utility.formatURL(agentId);
			if (agentId.indexOf('cus_') > -1)
				agentId = agentId.replace('cus_', '');
			// "sub_h283849jjfnu3" => "h283849jjfnu3"
			subId = Utility.formatURL(subId);
			if (subId.indexOf('sub_') > -1)
				subId = subId.replace('sub_', '');

			var route = '#agent/' + agentId + '/' + subId;
			var params = Router.getConfirmationParams();
			if (params && agentId == params.agentId)
				Backbone.history.fragment = null;
			Backbone.history.navigate(route, {
				trigger : true
			});
		},
		__contactAdmin : function() {
			var res = this.getResponse();
			var payload = {};
			payload.subject = res.title;
			payload.text = res.message;

			Utility.contactAdmin(payload);
		}
	});
});
