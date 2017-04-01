define(['jquery', 'underscore', 'backbone', 'events', 'router', 'utility', 'views/helpers/GoogleAnalyticsTrackingView', 'models/MapModel', 'models/SearchModel', 'collections/PropertiesCollection', 'text!templates/listings/ListingsPropertiesHeaderTemplate.html'], function($, _, Backbone, Events, Router, Utility, GoogleAnalyticsTrackingView, MapModel, Search, Collection, Template) {
	return Backbone.View.extend({
		el : "#ListingsPropertiesHeader",
		__modal : null,
		__deals : null,
		__cityNameDialog : null,
		events : {
			"click #SorterToggle" : "toggledSorter",
			"click a#SortByDealType" : function(e) {
				e.preventDefault();
				var sortVar = $(e.target).text().trim().replace(/\s+/g, '');
				Collection.sortCollection(sortVar);
			}
		},
		initialize : function() {
			_.bindAll(this, 'render');
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.listenTo(Collection, 'sync', function() {
				var that = this;
				setTimeout(function() {
					that.propertyCount();
				}, 400);
			});
			this.listenTo(Events, Events.syncSidebar, this.syncSidebarItemsCount);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			this.$el.html(Template);
			return this;
		},
		propertyCount : function() {
			this.__deals = Collection.getDealsCount();
			if (this.__deals.homes == 1)
				$('#SidebarTotals').text(this.__deals.homes + ' Home');
			else
				$('#SidebarTotals').text(this.__deals.homes + ' Homes');

			if (this.__deals.totaldeals == 1)
				$('#SidebarDeals').text(this.__deals.totaldeals + ' Deal');
			else
				$('#SidebarDeals').text(this.__deals.totaldeals + ' Deals');
			if (this.__deals.homes == 300)
				$('.TooManyMessage').show();
		},
		toggledSorter : function() {
			var sorter = $('#SortSettings');
			sorter.collapse('toggle');
			sorter.on('shown.bs.collapse', function(e) {
				e.stopPropagation();
				Events.trigger(Events.resize);
			});
			sorter.on('hidden.bs.collapse', function(e) {
				e.stopPropagation();
				Events.trigger(Events.resize);
			});
		},
		syncSidebarItemsCount : function(addedLayers, removedLayers, layertype) {
			var sum = {};
			var DealsTextString;
			var deals = this.__deals;
			var sidebarTotals = parseInt($('#SidebarTotals').text());
			var sidebarTotalDeals = parseInt($('#SidebarDeals').text());
			if (isNaN(sidebarTotalDeals)) {
				sidebarTotalDeals = 0;
			}
			if (addedLayers) {
				if (layertype == "GoodDeals") {
					sum.Totals = sidebarTotals + deals.good;
					sum.TotalDeals = sidebarTotalDeals + deals.good;
					if (sum.Totals > deals.homes) {
						sum.Totals = deals.homes;
					}
					if (sum.TotalDeals > deals.totaldeals) {
						sum.TotalDeals = deals.totaldeals;
					}
					if (sum.TotalDeals != deals.totaldeals) {
						DealsTextString = sum.TotalDeals + ' Good Deals';
					} else {
						DealsTextString = sum.TotalDeals + ' Deals';
					}
				} else if (layertype == "FairDeals") {
					sum.Totals = sidebarTotals + deals.fair;
					sum.TotalDeals = sidebarTotalDeals + deals.fair;
					if (sum.Totals > deals.homes) {
						sum.Totals = deals.homes;
					}
					if (sum.TotalDeals > deals.totaldeals) {
						sum.TotalDeals = deals.totaldeals;
					}
					if (sum.TotalDeals != deals.totaldeals) {
						DealsTextString = sum.TotalDeals + ' Fair Deals';
					} else {
						DealsTextString = sum.TotalDeals + ' Deals';
					}
				} else {
					sum.Totals = sidebarTotals + deals.rest;
					sum.TotalDeals = sidebarTotalDeals;
					if (sum.Totals > deals.homes) {
						sum.Totals = deals.homes;
					}
					if (sum.TotalDeals > deals.totaldeals) {
						sum.TotalDeals = deals.totaldeals;
					}
				}
			} else {
				if (layertype == "GoodDeals") {
					sum.Totals = sidebarTotals - deals.good;
					sum.TotalDeals = sidebarTotalDeals - deals.good;
					if (sum.TotalDeals === 0) {
						DealsTextString = '';
					} else {
						DealsTextString = sum.TotalDeals + ' Fair Deals';
					}
				} else if (layertype == "FairDeals") {
					sum.Totals = sidebarTotals - deals.fair;
					sum.TotalDeals = sidebarTotalDeals - deals.fair;
					if (sum.TotalDeals === 0) {
						DealsTextString = '';
					} else {
						DealsTextString = sum.TotalDeals + ' Good Deals';
					}
				} else {
					sum.Totals = sidebarTotals - deals.rest;
					sum.TotalDeals = sidebarTotalDeals;
					if (sum.TotalDeals === 0) {
						DealsTextString = '';
					} else {
						DealsTextString = sum.TotalDeals + ' Deals';
					}
				}
			}
			$('#SidebarTotals').text(sum.Totals + ' Homes');
			$('#SidebarDeals').text(DealsTextString);
		}
	});
});
