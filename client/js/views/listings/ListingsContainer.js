define(['jquery', 'underscore', 'backbone', 'events', 'text!templates/listings/ListingsContainerTemplate.html'], function($, _, Backbone, Events, Template) {
	return Backbone.View.extend({
		el : "#ListingsContainer",
		__model : null,
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
			this.renderContainer();
			this.setHeight();
			$(window).on('resize', function() {
				that.setHeight();
			});
		},
		renderContainer : function() {
			var that = this;
			require(['views/listings/ListingsMapContainer', 'views/listings/ListingsSidebarContainer'], function(ListingsMapContainer, ListingsSideBarContainer) {
				var container = new ListingsSideBarContainer();
				container.render();
				container = new ListingsMapContainer();
				container.render();
			});
		},
		setHeight : function() {
			var header = $("#Header").outerHeight(true);
			var footer = $("#footser-end").outerHeight(true);
			var height = $(window).outerHeight(true) - (header + footer);
			$(this.el).css('height', height + 'px');
			Events.trigger(Events.resize, height);
		}
	});
});
