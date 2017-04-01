define(['jquery', 'underscore', 'backbone', 'events', 'text!templates/listings/map/ListingsMapHeaderTemplate.html', 'models/MapModel'], function($, _, Backbone, Events, Template, Model) {
	return Backbone.View.extend({
		el : "#ListingsMapHeader",
		className : 'ListingsMapHeader',
		__model : null,
		initialize : function() {
			_.bindAll(this, 'render');
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.listenTo(Events, Events.resizeMap, this.resetMapHeaderSize);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			var that = this;
			this.__model = new Model();
			this.$el.html(Template);
			require(['views/listings/ListingsSearchView'], function(ListingsSearchView) {
				var view = new ListingsSearchView();
				view.render();
			});
			this.$el.addClass('ListingsMapHeader');
			if ($('input#searchgeo').css('width') != '200px') {
				$('input#searchgeo').css('width', '200px');
			}
			if ($('input.typeahead.form-control.tt-hint').css('width') != '200px') {
				$('input.typeahead.form-control.tt-hint').css('width', '200px');
			}
		},
		resetMapHeaderSize : function(openedDetails, detailsWidth, mapWidth) {
			if (openedDetails) {
				if (document.body.clientWidth <= 1024) {
					$('#ListingsFindDealsButton')[0].innerText = '';
					$('#ListingsFindDealsButton').append($('<span class="glyphicon glyphicon-search"></span>'));
					$('#ListingsFindDealsButton').css('width', '40px');
					$('input.typeahead.form-control.tt-hint').css('width', '120px');
					$('input#searchgeo').css('width', '120px');
					$('button#ListingsSearchOptions').css('display', 'none');
				} else if (document.body.clientWidth > 1024) {
					$('#ListingsFindDealsButton')[0].innerText = '';
					$('#ListingsFindDealsButton').append($('<span class="glyphicon glyphicon-search"></span>'));
					$('#ListingsFindDealsButton').css('width', '40px');
					$('input.typeahead.form-control.tt-hint').css('width', '140px');
					$('input#searchgeo').css('width', '140px');
					$('button#ListingsSearchOptions').css('display', 'none');
				}
			} else {
				if ($('#ListingsFindDealsButton').has($('<span class="glyphicon glyphicon-search"></span>'))) {
					$('<span class="glyphicon glyphicon-search"></span>').remove();
				}
				if ($('#ListingsFindDealsButton').attr('style') != undefined) {
					$('#ListingsFindDealsButton').removeAttr('style');
				}
				if ($('#ListingsFindDealsButton')[0].innerText != "FIND DEALS") {
					$('#ListingsFindDealsButton')[0].innerText = 'FIND DEALS';
				}
				if ($('input#searchgeo').css('width') != '174px') {
					$('input#searchgeo').css('width', '174px');
				}
				if ($('input.typeahead.form-control.tt-hint').css('width') != '174px') {
					$('input.typeahead.form-control.tt-hint').css('width', '174px');
				}
				if ($('button#ListingsSearchOptions').css('display') != "block") {
					$('button#ListingsSearchOptions').css('display', 'block');
				}
			}
		}
	});
});
