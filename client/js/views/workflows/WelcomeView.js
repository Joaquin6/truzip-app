define(['jquery', 'underscore', 'backbone', 'events', 'utility', 'jqueryeasing', 'views/ModalView', 'views/workflows/DealsView', 'views/helpers/GoogleAnalyticsTrackingView'], function($, _, Backbone, Events, Utility, JqueryEasing, ModalView, DealsView, GoogleAnalyticsTrackingView) {
	return Backbone.View.extend({
		__modal : null,
		__bestDeals : null,
		initialize : function() {
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.__createDealView();
		},
		onDispose : function() {
			if (this.__modal)
				this.__modal.close();
			this.remove();
			this.stopListening();
		},
		moveCarouselToBody : function() {
			// move deals back to home
			var dealsElement = $(this.__bestDeals.el);
			$('#deals').append(dealsElement);
		},
		onAfterCloseDialog : function() {
			this.__modal.close();
			this.__bestDeals.sliderGoTo(0, true);
			Utility.setPersistence('newUserBestDeals', true);
		},
		__createDealView : function() {
			if (this.__isNewUser())
				this.__launchWelcomeDialog();
			else
				this.__initSlider('#deals');
		},
		__initSlider : function(id) {
			this.__bestDeals = new DealsView({
				id : id
			});
		},
		__launchWelcomeDialog : function() {
			var dialogStyle = this.__getDialogWidth();
			var that = this;
			this.__modal = new ModalView({
				id : 'WelcomeDialog',
				dialogStyle : dialogStyle,
				title : $('#WelcomeDialogTitle').html(),
				body : $('#WelcomeDialogBody').html(),
				footer : $('#WelcomeDialogCloseButton').html(),
				onShow : function(e) {
					GoogleAnalyticsTrackingView.evt('WelcomeView', 'OnShowDialog');
				},
				onShown : function(e) {
					that.__initSlider('#WelcomeBody');
				},
				onHide : function(e) {
					that.moveCarouselToBody();
					GoogleAnalyticsTrackingView.evt('WelcomeView', 'OnCloseDialog');
				},
				onHidden : function(e) {
					that.onAfterCloseDialog();
				}
			});
			this.__modal.render();
		},
		__isNewUser : function() {
			var newUserBestDeals = Utility.getPersistence('newUserBestDeals');
			if (newUserBestDeals == undefined)
				return true;
			return false;
		},
		__getDialogWidth : function() {
			var dialogStyle = "width:80%;";
			if (isMobile.any)
				dialogStyle = "width:95%;";
			if (isMobile.seven_inch)
				dialogStyle = "width:80%;";
			return dialogStyle;
		}
	});
});
