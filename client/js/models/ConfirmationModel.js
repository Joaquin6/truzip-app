define(['jquery', 'underscore', 'backbone', 'sprintf', 'router', 'utility'], function($, _, Backbone, nopSprintf, Router, Utility) {
	return Backbone.Model.extend({
		url : '/agents',
		request : function(callback) {
			var params = Router.getConfirmationParams();
			params.agentId = 'cus_' + params.agentId;
			params.subId = 'sub_' + params.subId;
			var url = '/agents/' + params.agentId + '/' + params.subId;
			var that = this;
			$.ajax({
				url : url,
				success : function(data, status) {
					that.set('subscription', data);
				},
				error : function(err, status) {
					that.__onErrorResponse(err);
				}
			}).done(callback);
		},
		routeToAgentPage : function() {
			var route = '#agent';
			Backbone.history.navigate(route, {
				trigger : true
			});
		},
		routeToHomePage : function() {
			var route = '';
			Backbone.history.navigate(route, {
				trigger : true
			});
		},
		contactUs : function(email, message, callback) {
			var payload = {};
			payload.subject = "From Agent Confirmation";
			payload.text = sprintf("agent: %s, sent this message: %s", email, message);

			Utility.contactAdmin(payload).then(function(data) {
				callback(data);
			}).fail(function(error) {
				callback(error);
			}).done();
		},
		__onErrorResponse : function(err) {
			if (err.status == 404) {
				this.routeToAgentPage();
			}
		}
	});
});
