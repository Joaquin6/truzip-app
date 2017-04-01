define(['jquery', 'underscore', 'backbone', 'utility', 'events', 'text!templates/listings/ListingsPropertyTemplate.html'], function($, _, Backbone, Utility, Events, Template) {
	return Backbone.View.extend({
		id : "ListingPropertyItem",
		className : "panel panel-default",
		events : {
			"click .panel-body.ListingsSideBarCard" : "onShowDetails",
			"mouseover .panel-body.ListingsSideBarCard" : "hoverMapPopup",
			"mouseout .panel-body.ListingsSideBarCard" : "closeMapPopup"
		},
		template : _.template(Template),
		initialize : function() {
			_.bindAll(this, 'render');
			this.__titleTagText = $('head').find('title').text();
		},
		render : function() {
			var bind = this.getBind();
			this.$el.html(this.template(bind));
			this.$el.attr('deal-type', bind.DealType);
			this.$el.attr('price', bind.Price);
			this.$el.attr('yousave', bind.YouSave);
			this.__attachErrorHandlers();
			return this;
		},
		onShowDetails : function(e) {
			var uniqueId = '#' + this.model.get('_id');
			var parent = $(uniqueId).parent();
			var active = $('#ListingsProperties').find('.panel-primary');
			var SidebarWidth = $('#ListingsSidebarContainer').outerWidth(true);
			$('#ListingsPropertyDetailsContainer').css('right', SidebarWidth + 'px');
			if (document.body.clientWidth <= 799) {
				var ContainerWidth = $('#ListingsContainer').outerWidth(true);
				var adjustWidth = ContainerWidth - SidebarWidth;
				$('#ListingsPropertyDetailsContainer').css('width', adjustWidth + 'px');
			}
			if (active.length > 0) {
				var activeId = active.children().attr('id');
				if (activeId == uniqueId) {
					return;
				} else {
					active.switchClass("panel-primary", "panel-default");
				}
			}
			parent.switchClass("panel-default", "panel-primary");
			if (this.model.get('ImageUrl') == null) {
				var imgSrc = this.$el.find('img').attr('src');
				this.model.set('ImageUrl', imgSrc);
			}
			Events.trigger(Events.showDetails, this.model);
		},
		getBind : function() {
			var bind = {};
			bind.Price = Utility.formatCurrency(this.model.get('Price'));
			bind.YouSave = Utility.formatCurrency(this.model.get('YouSave'));
			bind.ImageUrl = Utility.getImageUrl(this.model);
			bind.UniqueId = this.model.get('_id');
			bind.Address = this.model.get('Address');
			bind.Bathrooms = this.model.get('BathroomsFull');
			bind.Bedrooms = this.model.get('Bedrooms');
			bind.DealType = Utility.getDealType(this.model);
			bind.DealIcon = Utility.getDealTypeIcon(this.model);
			bind.YearBuilt = this.model.get('YearBuilt');
			bind.ZipCode = this.model.get('ZipCode');
			bind.Latitude = this.model.get('Latitude');
			bind.Longitude = this.model.get('Longitude');
			bind.LatLng = [parseFloat(bind.Latitude), parseFloat(bind.Longitude)];
			bind.imgAlt = this.model.get('ImageAlternate');
			if (this.model.get('IsExcludeFromAlgo')) {
				bind.ValuationPrice = "N/A";
			} else {
				bind.ValuationPrice = Utility.formatCurrency(this.model.get('ValuationPrice'));
			}
			if (bind.DealType === "Above Market")
				bind.DealTypeClass = "col-md-12";
			else
				bind.DealTypeClass = "col-md-6";
			if (!bind.DealType)
				console.log(bind.DealType);
			if (this.model.get('YouSave') < 0) {
				bind.YouSaveVisibility = "none";
				if (bind.DealTypeClass == "col-md-6")
					bind.DealTypeClass = "col-md-12";
			} else {
				bind.YouSaveVisibility = "block";
			}
			return bind;
		},
		hoverMapPopup : function() {
			var markerObj = {};
			markerObj.uniqueId = this.model.get('_id');
			markerObj.dealtype = this.model.get('DealType');
			Events.trigger(Events.handleMapPopup, markerObj);
		},
		closeMapPopup : function() {
			Events.trigger(Events.handleMapPopup, null);
		},
		__attachErrorHandlers : function() {
			var Model = this.model;
			var imageEl = this.$el.find('img');
			var imgSource = $(imageEl).attr('src');
			if (imgSource == '/images/ListingsSidebarHouse.png')
				return;
			var that = this;
			$(imageEl).load(function(e) {
				// noop
			}).error(function(e) {
				// if we can't load the image - then move to back of current que...
				var failedURL = $(e.target).attr('src');
				var context = Model.getNextImageUrl(failedURL);
				if (context.conclude) {
					$(e.target).attr('src', context.noImage);
					Model.setNoImage(context.noImage);
				} else
					$(e.target).attr('src', context.url);
			});
		}
	});
});
