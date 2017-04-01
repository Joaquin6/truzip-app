define(['jquery', 'underscore', 'backbone', 'text!templates/DialogsTemplate.html'], function($, _, Backbone, Template) {
	return Backbone.View.extend({
		el : "#Dialogs",
		render : function() {
			this.$el.html(Template);
		}
	});
});
