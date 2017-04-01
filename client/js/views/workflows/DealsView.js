define(['jquery', 'underscore', 'backbone', 'utility', 'jqueryeasing', 'events', 'views/helpers/GoogleAnalyticsTrackingView', 'models/DealsModel', 'collections/PropertiesCollection', 'text!templates/workflows/DealsTemplate.html'], function($, _, Backbone, Utility, JqueryEasing, Events, GoogleAnalyticsTrackingView, Model, Collection, Template) {
	return Backbone.View.extend({
		__slider : null,
		__callback : null,
		__model : null,
		__deals : null,
		__status : null,
		initialize : function(options) {
			this.el = $(options.id);
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.__model = new Model();
			var that = this;
			this.__model.request(function(deals) {
				that.__status = {};
				that.__status.propertyDeals = Collection.getDealsCount();
				that.__status.searchedBy = that.__model.get('searchedBy');
				that.__deals = deals;
				that.render();
			});
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			if (this.__deals == null)
				return;
			this.__renderTemplate();
			this.__createSlider();
			if (this.__callback)
				this.__callback(this.__deals, this.__status);
		},
		onDeals : function(callback) {
			this.__callback = callback;
		},
		resizeSlider : function() {
			if (this.__slider == null)
				return;
			$(window).trigger('resize');
		},
		checkSliderDOM : function() {
			var slickTrack = this.__slider.find('.slick-track');
			if (slickTrack.width() < 10)
				this.resizeSlider();
			var diff = $(this.__slider).width() - slickTrack.width();
			var slideCount = slickTrack.find('.slick-slide').length;
			if (diff > 100 && slideCount > 2)
				this.resizeSlider();
		},
		checkWideSliderDOM : function() {
			var $slider = $(this.__slider);
			var slickTrack = $slider.find('.slick-track');
			if ($slider.children('button').length === 0) {
				diff = slickTrack.parent().width() - slickTrack.width();
				var leftAlign = diff / 2;
				slickTrack.css('left', leftAlign);
			}
		},
		sliderGoTo : function(index, animate) {
			if (this.__deals == null)
				return;
			this.__slider.slick('slickGoTo', index, animate);
		},
		__renderTemplate : function() {
			var node = $(Template).closest('#todaysdeals');
			if ($(this.el).length == 0)
				this.$el.html(node);
			else
				$(this.el).html(node);
		},
		__createSlider : function() {
			this.__addSliderItems();
			this.__initSlider();
			this.__attachErrorHandlers();
			if (!this.__isListingsPage())
				this.__attachClickHandler();
			this.resizeSlider();
		},
		__addSliderItems : function() {
			var root = this.__getCarouselRoot();
			var template = this.__getItemTemplate();
			for (var i = 0; i < this.__deals.length; i++) {
				var property = this.__deals[i];
				var bind = this.__getBind(property);
				var clone = $(template).clone();
				var item = this.__createItem(clone, bind);
				$(root).append(item);
			}
		},
		__initSlider : function() {
			var that = this;
			var sliderElement = this.__getCarouselRoot();
			this.__slider = sliderElement.slick({
				dots : false,
				centerMode : false,
				autoplay : true,
				autoplaySpeed : 3000,
				infinite : false,
				speed : 500,
				slidesToShow : 4,
				slidesToScroll : 1,
				responsive : [{
					breakpoint : 1290,
					settings : {
						slidesToShow : 3,
						slidesToScroll : 1
					}
				}, {
					breakpoint : 875,
					settings : {
						slidesToShow : 2,
						slidesToScroll : 1
					}
				}, {
					breakpoint : 599,
					settings : {
						slidesToShow : 1,
						slidesToScroll : 1
					}
				}]
			});
			if (this.__deals.length == 2)
				this.__centerSlider();
		},
		__attachErrorHandlers : function() {
			var that = this;
			var list = $(this.el).find('#CarouselList');
			if (list.length == 0)
				list = this.$el.find('#CarouselList');
			list.find('img').error(function(e) {
				// if we can't load the image - then try once again - else just remove it...
				that.__removeFromSlider(this);
			});
		},
		__removeFromSlider : function(ctx) {
			var sliderContainer = $(ctx).closest('.slick-slider');
			var slider = sliderContainer.slick('getSlick');
			var sliderItem = $(ctx).closest('#WelcomeBestDealItem');
			var that = this;
			if (sliderContainer.hasClass('slick-initialized')) {
				if (sliderItem.hasClass('slick-slide')) {
					var index = sliderItem.data('slick-index') + 1;
					slider.slickRemove(index, true);
				}
			} else {
				sliderItem.remove();
				slider.slick('setPosition');
			}
		},
		__attachClickHandler : function(e) {
			$('#todaysdeals').find('a').click(function(e) {
				var address = $(e.target).attr('alt');
				GoogleAnalyticsTrackingView.evt('WelcomeView', 'OnClickImage: ' + address);
				return true;
			});
		},
		__createItem : function(clone, bind) {
			var html = $(clone).html();
			var template = _.template(html);
			return template(bind);
		},
		__getBind : function(property) {
			var bind = {};
			bind.ZipCode = property.ZipCode;
			bind.City = property.City;
			bind.YouSave = '$' + Utility.nFormatter(property.YouSave);
			bind.Price = Utility.formatCurrency(property.Price);
			bind.Bathrooms = property.BathroomsFull;
			if (bind.Bathrooms === 0)
				bind.Bathrooms = 'N/A';
			bind.Bedrooms = property.Bedrooms;
			if (bind.Bedrooms === 0)
				bind.Bedrooms = 'N/A';
			bind.ImageUrl = Utility.getImageUrl(property);
			bind.imgAlt = Utility.getImgAltDesc(property.Address);
			bind.SearchUrl = "/homes-for-sale/" + property.ZipCode;
			return bind;
		},
		__centerSlider : function() {
			var slider = $(this.__slider).slick('getSlick');
			var leftOverWidth = slider.$slider.width() - slider.$slideTrack.width();
			slider.$slideTrack.css('width', leftOverWidth + 'px');
			slider.setPosition();
		},
		__getItemTemplate : function() {
			var node = $(Template).closest('.ItemWelcomeTemplate');
			if (this.__isListingsPage())
				node = $(Template).closest('.ItemSignInTemplate');
			return node;
		},
		__getCarouselRoot : function() {
			var root = $(this.el).find('#CarouselList');
			if (root.length == 0)
				root = this.$el.find('#CarouselList');
			return root;
		},
		__isListingsPage : function() {
			return location.pathname.indexOf('homes-for-sale') > -1;
		},
	});
});
