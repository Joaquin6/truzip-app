define(['jquery', 'underscore', 'backbone', 'events', 'utility', 'views/ModalView', 'models/ConfirmationModel', 'text!templates/generic/ConfirmationTemplate.html'], function($, _, Backbone, Events, Utility, ModalView, Model, Template) {
	return Backbone.View.extend({
		__data : null,
		__modal : null,
		model : null,
		el : '#Body',
		template : _.template(Template),
		initialize : function(options) {
			Utility.track();
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.model = new Model();
			var that = this;
			this.model.request(function(sub) {
				that.__data = sub;
				that.render(sub);
			});
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function(sub) {
			var bind = this.getBind(sub);
			this.$el.html(this.template(bind));
			this.__setupHandlers();
		},
		getBind : function(sub) {
			if (!sub)
				sub = this.model.get('subscription');
			var bind = {};
			bind.geo = sub.metadata.geo;
			bind.email = sub.metadata.email;
			bind.plan_id = sub.plan.id;
			bind.subscription_id = sub.id;
			if (bind.subscription_id.indexOf('sub_') > -1)
				bind.subscription_id = bind.subscription_id.replace('sub_', '');
			bind.customer_id = sub.customer;
			if (bind.customer_id.indexOf('cus_') > -1)
				bind.customer_id = bind.customer_id.replace('cus_', '');
			bind.firstName = sub.metadata.firstName;
			bind.lastName = sub.metadata.lastName;
			bind.numOfLeads = sub.metadata.number_of_leads;
			bind.price = Utility.stringifyPennyValue(1, sub.plan.amount);
			bind.chargePerLead = Utility.currencyToNumber(bind.price) / parseInt(bind.numOfLeads);
			bind.billing_address_line1 = sub.metadata.billing_address_line1;
			bind.billing_address_city = sub.metadata.billing_address_city;
			bind.billing_address_state = sub.metadata.billing_address_state;
			bind.billing_address_zip = sub.metadata.billing_address_zip;
			bind.billing_address_country_code = sub.metadata.billing_address_country_code;
			bind.card_brand = sub.metadata.card_brand;
			bind.card_last4 = sub.metadata.card_last4;
			bind.startDateString = sub.startDateString;
			bind.endDateString = sub.endDateString;
			bind.startingBillingCycle = this.__getBillingCycleDate(bind.startDateString);
			bind.endingBillingCycle = this.__getBillingCycleDate(bind.endDateString);
			return bind;
		},
		__getBillingCycleDate : function(string) {
			if (string.indexOf(', ') > -1) {
				var stringSplit = string.split(', ');
				return stringSplit[1];
			} else
				return string;
		},
		__setupHandlers : function() {
			var that = this;
			$('#emailUsLink').on('click', function(e) {
				e.preventDefault();
				that.__openEmailUsDialog();
			});

			$('#emailUsJumbo').on('click', function(e) {
				e.preventDefault();
				that.__openEmailUsDialog();
			});

			var model = this.model;
			$('#purchaseMoreLeads').on('click', function(e) {
				e.preventDefault();
				model.routeToAgentPage();
			});

			$('#agentDone').on('click', function(e) {
				e.preventDefault();
				model.routeToHomePage();
			});
		},
		__openEmailUsDialog : function() {
			var dialogTitle = _.template($('#EmailUsDialogTitle').html())({
				title : 'Email Truzip'
			});
			var that = this;
			this.__modal = new ModalView({
				id : 'EmailUsDialog',
				title : dialogTitle,
				body : $('#EmailUsDialogBody').html(),
				footer : $('#EmailUsDialogFooter').html(),
				onShown : function(e) {
					that.__bindEmailUs();
				}
			});
			this.__modal.render();
		},
		__bindEmailUs : function() {
			var sub = this.__data;
			var that = this;
			$('#EmailUsSubmit').off('click').on('click', function(e) {
				e.preventDefault();
				var email = sub.metadata.email;
				if (email.length == 0)
					return;
				var message = $('#message-text').val();
				if (message.length == 0)
					return;
				that.__contactAdmin(email, message);
			});
		},
		__closeModal : function() {
			this.__modal.close();
			this.__modal = null;
		},
		__launchSubmittedDialog : function() {
			var dialogTitle = _.template($('#tzDialogTitle').html())({
				title : 'Email Submitted'
			});
			var that = this;
			this.__modal = new ModalView({
				id : 'ContactAgentSubmittedDialog',
				title : dialogTitle,
				body : $('#ContactAgentSubmittedDialogBody').html(),
				footer : $('#ContactAgentSubmittedDialogFooter').html()
			});
			this.__modal.render();
		},
		__contactAdmin : function(email, message) {
			var model = this.model;
			var that = this;
			model.contactUs(email, message, function(status) {
				that.__closeModal();
				if (status === 'OK')
					that.__launchSubmittedDialog();
				else
					that.__launchErrorDialog();
			});
		},
		__launchErrorDialog : function() {
			var dialogTitle = _.template($('#tzDialogTitle').html())({
				title : 'Unable to Contact Admin'
			});
			var dialogBody = _.template($('#ErrorDialogBody').html())({
				errorMessage : 'An error occured while attempting to send your message. Truzip Admin and IT have been notified of this issue. Please try again later!'
			});
			var that = this;
			this.__modal = new ModalView({
				id : 'ContactUsErrorDialog',
				title : dialogTitle,
				body : dialogBody,
				footer : $('#ErrorDialogFooter').html()
			});
			this.__modal.render();
		}
	});
});
