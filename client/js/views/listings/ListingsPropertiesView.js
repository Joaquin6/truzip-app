define(['jquery', 'underscore', 'backbone', 'jqueryeasing', 'router', 'events', 'utility', 'collections/PropertiesCollection', 'views/listings/ListingsPropertyView'], function($, _, Backbone, JqueryEasing, Router, Events, Utility, PropertiesCollection, PropertyView) {
	return Backbone.View.extend({
		__getImageMax : [],
		el : "#ListingsProperties",
		initialize : function(options) {
			_.bindAll(this, 'render');
			this.__setupHandlers();
			this.loadPropertyDetailsPanel();
			PropertiesCollection.request();
			this.setHeight();
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
			Utility.ClearRenderQueue();
		},
		render : function(item) {
			if (item == undefined)
				return;
			if (Utility.isExcluded(item))
				return;
			var view = new PropertyView({
				model : item
			});
			var that = this;
			var list = [], badList = [];
			Utility.RenderQueue(function(context) {
				var chunk = context.render().el;
				var listParent = $("#ListingsProperties.Properties-Block");
				listParent.append(chunk);
			}, view);
			// inform others (such as map - that we have a new property)
			Events.trigger(Events.property, item);
		},
		loadPropertyDetailsPanel : function() {
			require(['views/listings/ListingsPropertyDetailsView'], function(ListingsPropertyDetailsView) {
				var view = new ListingsPropertyDetailsView();
				view.render();
			});
		},
		setHeight : function() {
			var container = $("#ListingsContainer").outerHeight(true);
			var header = $("#ListingsPropertiesHeader").outerHeight(true);
			var height = container - header;
			$(this.el).css('height', height + 'px');
		},
		scrollToProperty : function(context) {
			var id = context.alt.replace(/\"/g, "");
			var uniqueId = '#' + id;
			var parent = $(uniqueId).parent();
			var active = $('#ListingsProperties').find('.panel-primary');
			if (active.length > 0) {
				var activeId = active.children().attr('id');
				if (activeId == id) {
					$('#ListingsProperties').scrollTo($(uniqueId), 2000, {
						easing : 'easeInOutQuart'
					});
					return;
				} else {
					active.switchClass("panel-primary", "panel-default", 2000, "easeInOutQuad");
				}
			}
			if ($(uniqueId).length === 0) {
				context.action = 'PropertyLoading';
				Events.trigger(Events.notify, context);
				return;
			}
			$('#ListingsProperties').scrollTo($(uniqueId), 2000, {
				easing : 'easeInOutQuart',
				step : function() {
					parent.switchClass("panel-default", "panel-primary", 2000, "easeInOutQuad");
				}
			});
		},
		syncSidebarItems : function(addedLayers, removedLayers, layertype) {
			if (addedLayers) {
				for ( i = 0; i < addedLayers.length; i++) {
					var AddedLayerId = '#' + addedLayers[i].options.alt;
					$(AddedLayerId).css('display', 'block');
				}
			} else {
				for ( i = 0; i < removedLayers.length; i++) {
					var RemovedLayerId = '#' + removedLayers[i].options.alt;
					$(RemovedLayerId).css('display', 'none');
				}
			}
		},
		__setupHandlers : function() {
			this.listenTo(PropertiesCollection, 'add', this.render);
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.listenTo(Events, Events.resize, this.setHeight);
			this.listenTo(Events, Events.nanoScrollTo, this.scrollToProperty);
			this.listenTo(Events, Events.syncSidebar, this.syncSidebarItems);
		}
	});
});
