define(['jquery', 'underscore', 'backbone', 'events', 'text!templates/listings/ListingsSidebarContainerTemplate.html'], function($, _, Backbone, Events, Template) {
	return Backbone.View.extend({
		el : "#ListingsSidebarContainer",
		initialize : function() {
			_.bindAll(this, 'render');
			this.listenTo(Events, Events.dispose, this.onDispose);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			var that = this;
			this.$el.html(Template);
			require(['views/listings/ListingsPropertiesHeaderView', 'views/listings/ListingsPropertiesView'], function(ListingsPropertiesHeaderView, ListingsPropertiesView) {
				var view = new ListingsPropertiesHeaderView();
				view.render();
				view = new ListingsPropertiesView();
				view.render();
			});
		}
	});
});
