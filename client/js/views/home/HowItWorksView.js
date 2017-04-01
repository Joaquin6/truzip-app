define(['jquery', 'underscore', 'backbone', 'events', 'text!templates/home/HowItWorksTemplate.html'], function($, _, Backbone, Events, Template) {
	return Backbone.View.extend({
		el : "#howitworks",
		initialize : function(options) {
			this.listenTo(Events, Events.dispose, this.onDispose);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			this.$el.html(Template);
		}
	});
});
