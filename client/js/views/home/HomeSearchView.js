define(['jquery', 'underscore', 'backbone', 'jqueryeasing', 'slick', 'typeahead', 'events', 'models/SearchModel', 'text!templates/home/HomeSearchTemplate.html'], function($, _, Backbone, JqueryEasing, Slick, Typeahead, Events, Model, Template) {
	return Backbone.View.extend({
		__typeahead : null,
		el : "#homesearch",
		initialize : function() {
			var that = this;
			Model.request(function(response) {
				that.initTypeahead(response);
			});
			this.listenTo(Events, Events.onCloseDialog, this.__applyFocus);
		},
		render : function() {
			this.$el.html(Template);
			this.initSearch();
		},
		initSearch : function() {
			var that = this;
			$('#search').click(function() {
				that.search();
			});
			$('#searchgeo').keypress(function(e) {
				if (e.which == 13)
					that.search();
			});
			this.__applyFocus();
		},
		search : function() {
			var geo = $('#searchgeo').val().toLowerCase();
			Model.search(geo);
		},
		initTypeahead : function(response) {
			var substringMatcher = function(strs) {
				return function findMatches(q, cb) {
					var matches;
					var substrRegex;
					// an array that will be populated with substring matches
					matches = [];
					// regex used to determine if a string contains the substring `q`
					substrRegex = new RegExp(q, 'i');
					// iterate through the pool of strings and for any string that
					// contains the substring `q`, add it to the `matches` array
					$.each(strs, function(i, str) {
						if (substrRegex.test(str)) {
							// the typeahead jQuery plugin expects suggestions to a
							// JavaScript object, refer to typeahead docs for more info
							matches.push({
								value : str
							});
						}
					});
					cb(matches);
				};
			};
			// var footer = "<strong>If you can't find your zipcode, try a city name!</strong>";
			var typeaHead = $('.typeahead').typeahead({
				name : 'zipcodes',
				local : response,
				hint : true,
				highlight : true,
				minLength : 3
			}, {
				source : substringMatcher(response)
			});
			this.__typeahead = typeaHead;
		},
		__applyFocus : function() {
			setTimeout(function() {
				$('#searchgeo').focus();
			}, 750);
		}
	});
});
