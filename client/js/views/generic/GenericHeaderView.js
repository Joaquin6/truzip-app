define(['jquery', 'underscore', 'backbone', 'text!templates/generic/GenericHeaderTemplate.html'], function($, _, Backbone, Template) {
	return Backbone.View.extend({
		el : "#Header",
		render : function() {
			this.$el.html(Template);
		}
	});
});
