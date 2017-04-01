define(['jquery', 'underscore', 'backbone', 'sprintf', 'utility', 'events', 'views/ModalView', 'text!templates/listings/PropertyDetailsTopTemplate.html'], function($, _, Backbone, nopSprintf, Utility, Events, ModalView, Template) {
	return Backbone.View.extend({
		el : "#PropertyDetailsTopContainer",
		__dialog : null,
		__model : null,
		__bind : null,
		template : _.template(Template),
		events : {
			"click button#openLargeImagesBtn" : function(e) {
				e.preventDefault();
				this.__launchLargeImages(this.__model, this.__bind);
			},
			"click #GetMoreInfoButton" : function(e) {
				e.preventDefault();
				if ($(e.target).hasClass('disabled'))
					return;
				var userEmail = $('#GetMoreInfoEmail').val();
				if (userEmail.length == 0)
					console.log('Handle Empty User email');
				else if (!Utility.validateEmail(userEmail))
					console.log('Handle User Email Not Valid');
				else {
					$(e.target).disable(true);
					this.__handleGetMoreInfo(userEmail);
				}
			}
		},
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
			if (model == undefined) {
				this.$el.html(Template);
				return;
			}
			this.__model = model;
			var bind = this.getBind(model);
			this.__bind = bind;
			this.$el.html(this.template(bind));
			Utility.populateEmail('#GetMoreInfoEmail');
			this.__initSlider(model, bind);
		},
		getBind : function(model) {
			var bind = {};
			bind.Price = Utility.formatCurrency(model.get('Price'));
			bind.YouSave = Utility.formatCurrency(model.get('YouSave'));
			bind.ImageUrl = model.get('ImageUrl');
			bind.DealType = Utility.getDealType(model);
			bind.DealIcon = Utility.getDealTypeIcon(model);
			bind.Address = model.get('Address');
			if (model.get('IsExcludeFromAlgo')) {
				bind.ValuationPrice = "N/A";
			} else {
				bind.ValuationPrice = Utility.formatCurrency(model.get('ValuationPrice'));
			}
			if (model.get('YouSave') < 0)
				bind.YouSaveVisibility = "none";
			else
				bind.YouSaveVisibility = "block";
			return bind;
		},
		__initSlider : function(model, bind) {
			var parentImg = bind.ImageUrl;
			var imgElem = [];
			var defImg = false;
			var sliderElement = $(".slider");
			var alter = Utility.getImgAltDesc(bind.Address);
			var urls = Utility.getSliderImages(model);
			if (urls != "/images/ListingsSidebarHouse.png" && urls.length > 1) {
				if (parentImg == "/images/ListingsSidebarHouse.png") {
					var defImg = true;
					if (urls[0] != "/images/ListingsSidebarHouse.png")
						urls.unshift("/images/ListingsSidebarHouse.png");
				}
				var tmpl = model.getSlideImageContent(urls, alter);
				sliderElement.html(tmpl);
				this.__attachErrorHandlers(sliderElement, alter, defImg);
			}
			sliderElement.on('init', function(event, slick) {
				if (slick.options.isNoImg) {
					slick.$slider.siblings('#openLargeImages').hide();
					slick.$nextArrow.hide();
					slick.$prevArrow.hide();
				}
				setTimeout(function() {
					var slick = $('.slider').slick('getSlick');
					var sliderTrack = $('.slick-track');
					var trackParent = sliderTrack.parent();
					var panelbody = sliderTrack.closest('.panel-body');
					var bodyWidth = panelbody.outerWidth(true);
					var bodyHeight = panelbody.css('max-height');
					sliderElement.css('max-height', bodyHeight);
					trackParent.css('max-height', bodyHeight);
					var images = sliderTrack.find('.slick-slide');
					for ( i = 0; i < images.length; i++) {
						var image = images[i];
						var currentStyle = image.getAttribute('style');
						var newStyle = 'width: ' + bodyWidth + 'px;';
						if (currentStyle != newStyle) {
							image.setAttribute('style', newStyle);
						}
					}
				}, 400);
			});
			var slickOptions = this.__getSlickOptions({
				isNoImg : defImg
			});
			sliderElement.slick(slickOptions);
		},
		__launchLargeImages : function(model, bind) {
			var urls = Utility.getSliderImages(model);
			var dialogTitle = _.template($('#LargeImagesDialogTitle').html())({
				title : bind.Address
			});
			var dialogBody = _.template($('#LargeImagesDialogBody').html())({
				urls : urls
			});
			if (this.__dialog)
				this.__dialog.destroy();
			var that = this;
			this.__dialog = new ModalView({
				id : 'LargeImagesDialog',
				dialogStyle : 'width:55%;',
				title : dialogTitle,
				body : dialogBody,
				footer : $('#tzDefaultDialogFooter').html(),
				onShow : function(e) {
					if (this.$body.find('#sliderimg').length > 1) {
						this.$body.find('#largeImagesSlider').slick(that.__getSlickOptions({
							variableWidth : true
						}));
					}
				},
				onShown : function(e) {
					var body = this.$body.find('#largeImagesSlider');
					if (body.height() > parseInt(body.closest('.panel-body').css('max-height')))
						body.closest('.panel-body').css('max-height', body.height());
				}
			});
			this.__dialog.render();
		},
		__closeModal : function() {
			this.__dialog.close();
			this.__dialog = null;
		},
		__handleGetMoreInfo : function(userEmail) {
			var Model = this.__model;
			var that = this;
			Model.sendPropertyDetails(userEmail).done(function(message) {
				that.__showResponceDialog(message);
			}).fail(function(error) {
				that.__showResponceDialog(error);
			});
		},
		__showResponceDialog : function(context) {
			var dialogTitle = _.template($('#GetMoreInfoDialogTitle').html())({
				title : context.title
			});
			var dialogBody = _.template($('#GetMoreInfoDialogBody').html())({
				body : context.body,
				conclusion : context.conclusion
			});
			if (this.__dialog)
				this.__dialog.destroy();
			var that = this;
			this.__dialog = new ModalView({
				id : 'GetMoreInfoDialog',
				title : dialogTitle,
				body : dialogBody,
				footer : $('#ContactAgentSubmittedDialogFooter').html(),
				hideCloseButton : true,
				onHidden : function(e) {
					that.__onHiddenDialog();
				}
			});
			this.__dialog.render();
		},
		__onHiddenDialog : function() {
			$('#GetMoreInfoButton').disable(false);
		},
		__getSlickOptions : function(opts) {
			opts || ( opts = {});
			var options = {
				dots : false,
				centerMode : true,
				infinite : false,
				speed : 500,
				slidesToShow : 1,
				adaptiveHeight : false,
				variableWidth : false,
				autoplay : false,
				autoplaySpeed : 4000,
				edgeFriction : 0.35,
				centerPadding : '0px',
				isNoImg : false
			};
			_.extend(options, _.pick(opts, _.keys(options)));
			return options;
		},
		__attachErrorHandlers : function(sliderElement, alter, isNoImg) {
			var that = this;
			sliderElement.find('img').load(function(e) {
				if ($(this).attr('src') == "/images/ListingsSidebarHouse.png")
					return;
				// noop
				if (isNoImg) {
					var sliderContainer = $(this).closest('.slider');
					var slider = sliderContainer.slick('getSlick');
					slider.slickRemove(1, true);
					slider.refresh();
				}
			}).error(function(e) {
				// if we can't load the image - then try once again - else just remove it...
				that.__reloadOrRemove(this, alter, isNoImg);
			});
		},
		__reloadOrRemove : function(ctx, alter, isNoImg) {
			var reloaded = $(ctx).attr("src").indexOf("reload") > -1;
			if (reloaded) {
				var sliderContainer = $(ctx).closest('.slider');
				var slider = sliderContainer.slick('getSlick');
				var sliderItem = $(ctx).closest('div');
				var that = this;
				if (sliderContainer.hasClass('slick-initialized')) {
					if (sliderItem.hasClass('slick-slide')) {
						var index = sliderItem.data('slick-index') + 1;
						slider.slickRemove(index, true);
						var slideLength = sliderContainer.find('.slick-slide').length;
						if (slideLength == 1)
							sliderContainer.siblings('#openLargeImages').hide();
						slider.refresh();
					}
				} else
					$(ctx).closest('div').remove();
			} else {
				var d = new Date();
				var src = $(ctx).attr("src");
				$(ctx).attr("src", src + "?reload=" + d.getTime());
			}
		}
	});
});
