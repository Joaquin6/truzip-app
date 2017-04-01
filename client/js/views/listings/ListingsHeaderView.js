define(['jquery', 'underscore', 'backbone', 'jqueryeasing', 'utility', 'events', 'router', 'views/ModalView', 'views/helpers/GoogleAnalyticsTrackingView', 'text!templates/listings/ListingsHeaderTemplate.html'], function($, _, Backbone, JqueryEasing, Utility, Events, Router, ModalView, GoogleAnalyticsTrackingView, Template) {
	return Backbone.View.extend({
		__dialog : null,
		el : "#Header",
		events : {
			"click #SellFor" : function(e) {
				e.preventDefault();
				GoogleAnalyticsTrackingView.evt('SellForMore', 'OnClicked');
				var payload = {};
				payload.subject = "Sell for More - Notification";
				payload.text = "Someone clicked on Sell for more";
				Utility.contactAdmin(payload);
				this.__launchSellForDialog();
			},
			"click #WhyBuyWithTruzip" : function(e) {
				e.preventDefault();
				GoogleAnalyticsTrackingView.evt('BuyForLess', 'OnClicked');
				var payload = {};
				payload.subject = "Buy for Less - Notification";
				payload.text = "Someone clicked on Buy for less";
				Utility.contactAdmin(payload);
				this.__launchBuyWithTZDialog();
			}
		},
		render : function() {
			this.$el.html(Template);
		},
		__closeModal : function() {
			this.__dialog.close();
			this.__dialog = null;
		},
		__launchSellForDialog : function() {
			var dialogTitle = _.template($('#tzDialogTitle').html())({
				title : 'Sell for More'
			});
			var that = this;
			this.__dialog = new ModalView({
				id : 'SellForDialog',
				title : dialogTitle,
				body : $('#SellForDialogBody').html(),
				footer : $('#SellForDialogFooter').html(),
				onShown : function(e) {
					that.__bindSellForEmail();
				}
			});
			this.__dialog.render();
		},
		__launchSubmittedDialog : function() {
			var dialogTitle = _.template($('#tzDialogTitle').html())({
				title : 'Email Submitted'
			});
			var that = this;
			this.__dialog = new ModalView({
				id : 'ContactAgentSubmittedDialog',
				title : dialogTitle,
				body : $('#ContactAgentSubmittedDialogBody').html(),
				footer : $('#ContactAgentSubmittedDialogFooter').html()
			});
			this.__dialog.render();
		},
		__launchBuyWithTZDialog : function() {
			var dialogTitle = _.template($('#tzDialogTitle').html())({
				title : 'Afford a bigger home'
			});
			var that = this;
			this.__dialog = new ModalView({
				id : 'WhyBuyWithTruzipDialog',
				title : dialogTitle,
				body : $('#WhyBuyWithTruzipDialogBody').html(),
				footer : $('#WhyBuyWithTruzipDialogFooter').html(),
				onShown : function(e) {
					that.__bindBuyForLessEmail();
				}
			});
			this.__dialog.render();
		},
		__bindSellForEmail : function() {
			var that = this;
			Utility.populateEmail('#DialogsSellForEmail');
			$('#DialogsSellForSubmit').off('click').on('click', function(e) {
				e.preventDefault();
				var email = $('#DialogsSellForEmail').val();
				if (!Utility.validateEmail(email))
					return;

				var payload = {};
				payload.action = "ListingSellForMore";
				payload.email = email;
				payload.geo = Router.getGeo();
				payload.search = Router.getLocation();
				Utility.contactAgent(payload);

				GoogleAnalyticsTrackingView.evt('SellForMore', 'OnEmailSent ' + email);
				that.__closeModal();
				that.__launchSubmittedDialog();
			});
		},
		__bindBuyForLessEmail : function() {
			var that = this;
			Utility.populateEmail('#DialogsWhyBuyWithTruzipEmail');
			$('#DialogsWhyBuyWithTruzipSubmit').off('click').on('click', function(e) {
				e.preventDefault();
				var email = $('#DialogsWhyBuyWithTruzipEmail').val();
				if (!Utility.validateEmail(email))
					return;

				var payload = {};
				payload.action = "ListingBuyForLess";
				payload.email = email;
				payload.geo = Router.getGeo();
				payload.search = Router.getLocation();
				Utility.contactAgent(payload);

				GoogleAnalyticsTrackingView.evt('BuyForLess', 'OnEmailSent' + email);
				that.__closeModal();
				that.__launchSubmittedDialog();
			});
		}
	});
});
