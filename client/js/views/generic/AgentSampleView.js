define(['jquery', 'underscore', 'backbone', 'sprintf', 'views/helpers/GoogleAnalyticsTrackingView', 'utility', 'text!templates/generic/AgentSampleTemplate.html'], function($, _, Backbone, nopSprintf, GoogleAnalyticsTrackingView, Utility, Template) {
	return Backbone.View.extend({
		el : "#Body",
		render : function() {
			this.$el.html(Template);
			this.__track();
		},
		__track : function() {
			GoogleAnalyticsTrackingView.evt('AgentSample', 'Success - viewd Sample!');
			var payload = {};
			payload.subject = "From Agent Sample";
			payload.text = sprintf("Agent clicked on to view Agent Sample Page");
			Utility.contactAdmin(payload);
		}
	});
});
