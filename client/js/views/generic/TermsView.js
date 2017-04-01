define(['jquery', 'underscore', 'backbone', 'events', 'text!templates/generic/TermsTemplate.html'], function($, _, Backbone, Events, Template) {
	return Backbone.View.extend({
		el : "#Body",
		render : function() {
			this.$el.html(Template);
		}
	});
});
