define(['jquery', 'underscore', 'backbone', 'leaflet', 'utility', 'events', 'text!templates/listings/PropertyMapTemplate.html', 'collections/PropertiesCollection'], function($, _, Backbone, L, Utility, Events, Template, Collection) {
	return Backbone.View.extend({
		el : "#PropertyMap",
		__propertyMap : null,
		__mapContainer : null,
		initialize : function() {
			_.bindAll(this, 'render');
			this.listenTo(Events, Events.resizeDetails, this.setHeight);
			this.listenTo(Events, Events.showDetails, this.render);
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.listenTo(Events, Events.tabMap, this.initMap);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function(model) {
			this.model = model;
			this.$el.html(Template);
			this.setHeight();
			var that = this;
			if (this.__propertyMap != null)
				that.initMap();
		},
		initMap : function() {
			var mapChild = $('#PropertyDetailsMap').children();
			if (this.__propertyMap != null) {
				var that = this;
				if (mapChild.length > 0) {
					return;
				} else {
					setTimeout(function() {
						that.__propertyMap.invalidateSize(false);
					}, 400);
				}
			}
			var lat = this.model.get('Latitude');
			var lng = this.model.get('Longitude');
			var coords = [parseFloat(lat), parseFloat(lng)];
			if (isNaN(coords[0]) || isNaN(coords[1]))
				return;

			var osm = L.tileLayer.provider('Esri.WorldImagery');

			this.__propertyMap = L.map('PropertyDetailsMap', {
				attributionControl : false,
				center : coords,
				zoom : 18,
				maxZoom : 19,
				minZoom : 16,
				zoomControl : false,
				layers : [osm]
			});
			L.marker(coords, {
				icon : L.AwesomeMarkers.icon({
					icon : 'home',
					markerColor : 'red'
				}),
				iconColor : 'white'
			}).addTo(this.__propertyMap);
			var that = this;
			setTimeout(function() {
				that.__propertyMap.invalidateSize(false);
			}, 100);
		},
		setHeight : function(height) {
			$('#PropertyDetailsMap').css('height', height + 'px');
		}
	});
});
