define(['jquery', 'underscore', 'backbone', 'events', 'utility', 'views/home/home', 'views/listings/listings', 'views/generic/generic', 'views/helpers/GoogleAnalyticsTrackingView'], function($, _, Backbone, Events, Utility, Home, Listings, Generic, GoogleAnalyticsTrackingView) {
	var AppRouter = Backbone.Router.extend({
		routes : {
			"" : "home",
			"aboutus" : "aboutus",
			"careers" : "careers",
			"agentown" : "agentown",
			"agentsample" : "agentsample",
			"agentpurchase" : "agentpurchase",
			"agent" : "agent",
			"agent/:agentId/:subId" : "confirmation",
			"contact" : "contact",
			"faq" : "faq",
			"terms" : "terms",
			"homes-for-sale/(:geo)" : "listings"
		},
		initialize : function() {
			// this allows you to disable postback - if you do want postback - then set data-bypass on link
			$("body").on("click", "a:not(a[data-bypass])", function(e) {
				e.preventDefault();
				var href = $(this).attr("href");
				Backbone.history.navigate(href, true);
			});
			Backbone.history.start({
				root : '/',
				pushState : true
			});
		},
		home : function() {
			GoogleAnalyticsTrackingView.track('/', 'Home');
			var view = new Home();
			view.render();
		},
		aboutus : function() {
			GoogleAnalyticsTrackingView.track('/aboutus', 'AboutUs');
			var view = new Generic();
			view.render("AboutUs");
		},
		faq : function() {
			GoogleAnalyticsTrackingView.track('/faq', 'FAQ');
			var view = new Generic();
			view.render("FAQ");
		},
		careers : function() {
			GoogleAnalyticsTrackingView.track('/careers', 'Careers');
			var view = new Generic();
			view.render("Careers");
		},
		agent : function() {
			GoogleAnalyticsTrackingView.track('/agent', 'Agent');
			var view = new Generic();
			view.render("Agent");
		},
		agentown : function() {
			GoogleAnalyticsTrackingView.track('/agentown', 'AgentOwn');
			var view = new Generic();
			view.render("AgentOwn");
		},
		agentsample : function() {
			GoogleAnalyticsTrackingView.track('/agentsample', 'AgentSample');
			var view = new Generic();
			view.render("AgentSample");
		},
		agentpurchase : function() {
			GoogleAnalyticsTrackingView.track('/agentpurchase', 'AgentPurchase');
			var view = new Generic();
			view.render("AgentPurchase");
		},
		terms : function() {
			GoogleAnalyticsTrackingView.track('/terms', 'Terms');
			var view = new Generic();
			view.render("Terms");
		},
		contact : function() {
			GoogleAnalyticsTrackingView.track('/contact', 'Contact');
			var view = new Generic();
			view.render("Contact");
		},
		listings : function(geo) {
			GoogleAnalyticsTrackingView.track(window.location.pathname, 'Listings');
			var view = new Listings();
			view.render();
		},
		confirmation : function(agentId, subId) {
			var view = new Generic();
			view.render("Confirmation");
		},
		getGeo : function() {
			var tokens = window.location.pathname.split('/');
			if (tokens.length != 3)
				return null;
			var geo = tokens[2];
			return Utility.formatURL(geo);
		},
		getConfirmationParams : function() {
			var tokens = window.location.pathname.split('/');
			if (tokens.length != 4)
				return null;
			var agent = tokens[2];
			var subscription = tokens[3];
			var params = {};
			params.agentId = Utility.formatURL(agent);
			params.subId = Utility.formatURL(subscription);
			return params;
		},
		getLocation : function() {
			return window.location.pathname;
		},
		execute : function(callback, args) {
			Events.trigger(Events.dispose);
			Backbone.Router.prototype.execute.call(this, callback, args);
		}
	});
	return new AppRouter();
});
