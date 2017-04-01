define(['jquery', 'underscore', 'backbone', 'events', 'text!templates/listings/map/ListingsMapContainertemplate.html'], function($, _, Backbone, Events, Template) {
	return Backbone.View.extend({
		el : "#ListingsMapContainer",
		initialize : function(options) {
			this.listenTo(Events, Events.dispose, this.onDispose);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			var that = this;
			this.$el.html(Template);
			this.setWidth();
			this.renderMap();
			this.listenTo(Events, Events.resize, this.setWidth);
		},
		renderMap : function() {
			require(['views/listings/ListingsMapHeaderView', 'views/listings/ListingsMapView'], function(ListingsMapHeaderView, ListingsMapView) {
				var view = new ListingsMapHeaderView();
				view.render();
				view = new ListingsMapView();
				view.render();
			});
		},
		setWidth : function() {
			var sidebar = $("#ListingsSidebarContainer").outerWidth(true);
			var width = $(window).outerWidth(true) - sidebar;
			$('#ListingsMapContainer').css('width', width + 'px');
		}
	});
});
