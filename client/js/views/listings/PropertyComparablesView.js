define(['jquery', 'underscore', 'backbone', 'utility', 'events', 'views/listings/PropertyComparablesItemView', 'text!templates/listings/PropertyComparablesTemplate.html'], function($, _, Backbone, Utility, Events, ComparableView, Template) {
	return Backbone.View.extend({
		el : "#PropertyComparables",
		initialize : function() {
			_.bindAll(this, 'render');
			this.listenTo(Events, Events.showDetails, this.render);
			this.listenTo(Events, Events.dispose, this.onDispose);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function(model) {
			if (model == undefined)
				return;
			this.model = model;
			this.$el.html(Template);
			var comparables = model.get('Comparables');
			for (var i = 0; i < comparables.length; i++) {
				var comparable = comparables[i];
				var view = new ComparableView({
					model : comparable
				});
				var chunk = view.render().el;
				$('#ComparablesList.nano-content').append(chunk);
			}
			return this;
		}
	});
});
