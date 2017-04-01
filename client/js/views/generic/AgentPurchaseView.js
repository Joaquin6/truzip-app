define(['jquery', 'underscore', 'backbone', 'sprintf', 'views/helpers/GoogleAnalyticsTrackingView', 'utility', 'text!templates/generic/AgentPurchaseTemplate.html'], function($, _, Backbone, nopSprintf, GoogleAnalyticsTrackingView, Utility, Template) {
	return Backbone.View.extend({
		el : "#Body",
		render : function() {
			this.$el.html(Template);
			this.__track();
		},
		__track : function() {
			GoogleAnalyticsTrackingView.evt('AgentPurchase', 'Success - Purchased!');
			var payload = {};
			payload.subject = "From Agent Purchase";
			payload.text = sprintf("Agent clicked to purchase a Lead!");
			Utility.contactAdmin(payload);
		}
	});
});
