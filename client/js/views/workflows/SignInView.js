define(['jquery', 'underscore', 'backbone', 'sprintf', 'jqueryeasing', 'events', 'utility', 'router', 'views/helpers/GoogleAnalyticsTrackingView', 'views/ModalView', 'views/workflows/DealsView', 'models/SearchModel'], function($, _, Backbone, nopSprintf, JqueryEasing, Events, Utility, Router, GoogleAnalyticsTrackingView, ModalView, DealsView, SearchModel) {
	return Backbone.View.extend({
		__dialog : null,
		__bestDeals : null,
		initialize : function() {
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.listenToOnce(Events, Events.mapLoaded, this.onMapLoaded);
			var that = this;
			$(window).on("debouncedresize", function(e) {
				if ($(e.target).width() > 1289)
					that.__checkSliderDOM(true);
			});
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		onMapLoaded : function() {
			if (this.__isSignedIn())
				return;
			this.__launchSigninDialog();
		},
		__initSlider : function() {
			this.__bestDeals = new DealsView({
				id : '#SiginDealsBody'
			});
			var that = this;
			this.__bestDeals.onDeals(function(deals, status) {
				that.__bindHeader(deals, status);
				that.__bindBody();
			});
		},
		__bindBody : function() {
			this.__bindSignInEmail();
			this.__checkSliderDOM();
		},
		__bindHeader : function(deals, status) {
			if (deals.length == 0) {
				// hmmm, for some reason - we don't have any deals in this area...just let user search
				var payload = {};
				payload.subject = "Unable to Signin - No Deals in this Area";
				var url = SearchModel.getRoute();
				payload.text = sprintf("User searched in this area - but unable to bring up signin dialog because of no deals: %s", url);
				Utility.contactAdmin(payload);
				return;
			}
			var geo = deals[0].City;
			if (status.searchedBy == 'zipcode')
				geo = deals[0].ZipCode;
			var prop = status.propertyDeals;
			var homes = status.propertyDeals.homes == 300 ? "300+" : status.propertyDeals.homes;
			var text = sprintf("There are %s homes in %s", homes, geo);
			if (status.propertyDeals.totaldeals > 0) {
				if (status.propertyDeals.totaldeals == 1)
					text = sprintf("There are %s homes in %s, %s", homes, geo, "<span style='color:green'>1 deal</span>");
				else if (status.propertyDeals.totaldeals > 1) {
					var deals = sprintf("<span style='color:green'>%s deals</span>", status.propertyDeals.totaldeals);
					text = sprintf("There are %s homes in %s, %s", homes, geo, deals);
				}
			}
			$('#SignInTitle').html(text);
		},
		__launchSigninDialog : function() {
			var that = this;
			this.__dialog = new ModalView({
				id : 'SignInDialog',
				dialogStyle : "width:75%;",
				backdrop : 'static',
				hideCloseButton : true,
				title : $('#SignInDialogTitle').html(),
				body : $('#SiginDialogBody').html(),
				footer : $('#SiginDialogFooter').html(),
				onShow : function(e) {
					GoogleAnalyticsTrackingView.evt('SignIn', 'OnShowDialog');
				},
				onShown : function(e) {
					that.__initSlider();
				},
				onHide : function(e) {
					GoogleAnalyticsTrackingView.evt('SignIn', 'OnCloseDialog');
				}
			});
			this.__dialog.render();
		},
		__bindSignInEmail : function() {
			var that = this;
			$('#SignInSubmit').off('click').on('click', function(e) {
				e.preventDefault();
				var email = $('#SignInEmail').val();
				if (!Utility.validateEmail(email))
					return;
				that.__notify(email);
			});
			// $('#SignInEmail').focus();
		},
		__notify : function(email) {
			var payload = {};
			payload.action = "UserSignIn";
			payload.email = email;
			payload.geo = Router.getGeo();
			payload.search = Router.getLocation();

			var that = this;
			Utility.contactAgent(payload).then(function(agentMessage) {
				if (agentMessage.agentID)
					payload.agent = agentMessage.agentID;
				that.__persist(payload);
			}).fail(function(err) {
				console.log(err);
			}).done();
		},
		__persist : function(payload) {
			var json = {};
			json.email = payload.email;
			Utility.setPersistence('signin', json);
			SearchModel.persistSearch(undefined, payload);
			this.__dialog.hideModal();
			this.__track();
			GoogleAnalyticsTrackingView.evt('SignIn', 'OnEmailSent ' + payload.email);
		},
		__checkSliderDOM : function(wide) {
			if (wide)
				this.__bestDeals.checkWideSliderDOM();
			else
				this.__bestDeals.checkSliderDOM();
		},
		__isSignedIn : function() {
			var signin = Utility.getPersistence('signin');
			if (signin === undefined)
				return false;
			return true;
		},
		__track : function() {
			require(['views/helpers/GoogleAdwordsTrackingView'], function(GoogleAdwordsTrackingView) {
				GoogleAdwordsTrackingView.track();
			});
		}
	});
});
