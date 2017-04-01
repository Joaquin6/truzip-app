define(['jquery', 'underscore', 'backbone', 'text!templates/FooterTemplate.html'], function($, _, Backbone, Template) {
	return Backbone.View.extend({
		el : "#Footer",
		render : function() {
			this.$el.html(Template);
		}
	});
});
