define(['jquery', 'underscore', 'backbone', 'utility', 'events', 'views/helpers/GoogleAnalyticsTrackingView', 'text!templates/listings/ListingsPropertyDetailsTemplate.html'], function($, _, Backbone, Utility, Events, GoogleAnalyticsTrackingView, Template) {
	return Backbone.View.extend({
		el : "#ListingsPropertyDetailsContainer",
		__model : null,
		events : {
			"click #PropertyDetailsClose" : "onCloseDetails",
			"click li#PropertyTab" : "initMapTab"
		},
		initialize : function(options) {
			_.bindAll(this, 'render');
			this.__setupHandlers();
			this.listenTo(Events, Events.resize, this.onSetHeight);
			this.listenTo(Events, Events.showDetails, this.onShowDetails);
			this.listenTo(Events, Events.dispose, this.onDispose);
		},
		render : function() {
			var that = this;
			this.$el.html(Template);
			require(['views/listings/PropertyDetailsTopView', 'views/listings/PropertyDetailsView', 'views/listings/PropertyComparablesView', 'views/listings/PropertyMapView', 'views/listings/PropertySchoolsView', 'views/listings/PropertyTrendsView'], function(PropertyDetailsTopView, PropertyDetailsView, PropertyComparablesView, PropertyMapView, PropertySchoolsView, PropertyTrendsView) {
				var view = new PropertyDetailsTopView();
				view.render();
				view = new PropertyDetailsView();
				view.render();
				view = new PropertyComparablesView();
				view.render();
				view = new PropertySchoolsView();
				view.render();
				view = new PropertyTrendsView();
				view.render();
				view = new PropertyMapView();
				view.render();
				that.hide();
			});
		},
		onShowDetails : function(model) {
			this.__trackProperty(model);
			this.__model = model;
			var latitude = model.get('Latitude');
			var longitude = model.get('Longitude');
			var latlng = [parseFloat(latitude), parseFloat(longitude)];
			if (!$('#ListingsPropertyDetailsContainer').is(':visible')) {
				this.displayDetails();
				Events.trigger(Events.resizeMap, true, null, null, latlng);
			} else {
				$('#ListingsPropertyDetailsContainer').hide();
				this.displayDetails();
				Events.trigger(Events.resizeMap, true, null, null, latlng);
			}
			var dealtype = Utility.getDealType(this.__model);
			$('a#PropertyTrendsLink').text('Why' + dealtype + '?');
		},
		displayDetails : function() {
			var that = this;
			$('#PropertyDetailsBottomContainer').css('height', '0px');
			$("#ListingsPropertyDetailsContainer").show("slide", {
				direction : 'right'
			}, function() {
				that.onSetHeight(true);
			});
		},
		onCloseDetails : function(e) {
			$("#ListingsPropertyDetailsContainer").hide("slide", {
				direction : 'right'
			});
			var slider = $('#LargeImagesDialog').find($('.modal-body'));
			if (slider.children().length > 0) {
				slider.children().remove();
			}
			slider.removeClass('slick-initialized slick-slider');
			var detailsWidth = $('.ui-effects-wrapper')[0].clientWidth;
			var mapWidth = $('#ListingsMapContainer')[0].offsetWidth;
			Events.trigger(Events.resizeMap, false, detailsWidth, mapWidth, null);
			this.removeHighlight();
		},
		hide : function() {
			$(this.el).hide();
			$(this.el).css("visibility", "visible");
		},
		onSetHeight : function(animate) {
			if ($('#PropertyDetailsBottomContainer').length == 0)
				return;
			var height = $('#Footer').offset().top - $('#PropertyDetailsBottomContainer').offset().top - 10;
			if (animate) {
				$('#PropertyDetailsBottomContainer').animate({
					height : height
				}, 200);
			} else
				$('#PropertyDetailsBottomContainer').css('height', height + 'px');

			Events.trigger(Events.resizeDetails, height);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		initMapTab : function() {
			var hash = event.target.hash;
			var overflow = $('div#PropertyDetailsBottomContainer').css('overflow-y');
			if (hash == "#PropertyMap") {
				if (overflow != "hidden")
					$('div#PropertyDetailsBottomContainer').css('overflow-y', 'hidden');
				Events.trigger(Events.tabMap);
			} else {
				if (overflow != "auto")
					$('div#PropertyDetailsBottomContainer').css('overflow-y', 'auto');
			}
		},
		removeHighlight : function() {
			var active = $('#ListingsProperties').find('.panel-primary');
			if (active.length > 0)
				active.switchClass("panel-primary", "panel-default");
		},
		__trackProperty : function(model) {
			var dealtype = Utility.getDealType(model);
			var address = model.get('Address');
			GoogleAnalyticsTrackingView.evt('PropertyDetails', 'OnShowDetails: ' + dealtype + ' ' + address);
		},
		__setupHandlers : function() {
			//this.listenTo(Events, Events.resize, this.setHeight);
			$(window).on("throttledresize", function(event) {
				if (!$('#ListingsPropertyDetailsContainer').is(':visible')) {
					return;
				} else {
					var SidebarWidth = $('#ListingsSidebarContainer').outerWidth(true);
					$('#ListingsPropertyDetailsContainer').css('right', SidebarWidth + 'px');
					var detailsWidth = $('#ListingsPropertyDetailsContainer').outerWidth(true);
					var mapWidth = $('#ListingsContainer').outerWidth(true);
					Events.trigger(Events.resizeMap, true, detailsWidth, mapWidth, null);
				}
			});
		}
	});
});
