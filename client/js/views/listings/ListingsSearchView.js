define(['jquery', 'underscore', 'backbone', 'typeahead', 'select2', 'sprintf', 'events', 'router', 'utility', 'models/SearchModel', 'text!templates/listings/ListingsSearchTemplate.html'], function($, _, Backbone, Typeahead, Select2, nopSprintf, Events, Router, Utility, Model, Template) {
	return Backbone.View.extend({
		__typeahead : null,
		el : "#ListingsSearchOptionsPanel",
		events : {
			"click #ListingsSearchButton" : "onSearch",
			"click #ListingsSearchOptionsClose" : "onToggleOptions"
		},
		initialize : function(options) {
			_.bindAll(this, 'render');
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.listenTo(Events, Events.resize, this.resetMapHeaderSize);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			this.$el.html(Template);
			this.__renderActiveFilter();
			this.__setupHandlers();
		},
		onToggleOptions : function() {
			var headerHeight = $('.ListingsMapHeader').outerHeight();
			$('.SearchOptionsContainer').css('top', headerHeight + 'px');
			var dialog = $('.SearchOptionsContainer').find('.modal-dialog');
			dialog.css('margin', '0px auto');
			$('#ListingsSearchOptionsPanel').toggle("slide", {
				direction : 'up'
			});
		},
		onFilterReset : function() {
			Model.resetFilters();
			this.__initializeFromModel();
		},
		onSearch : function() {
			var minmax = this.__getMinMax();
			Model.set('PriceFrom', minmax.min);
			Model.set('PriceTo', minmax.max);
			Model.set('BedBth', $('#SearchBedBth').val());
			Model.set('Type', $('#SearchType').val());
			Model.set('SqFoot', $('#SearchSqFoot').val());
			Model.set('LotSize', $('#SearchLotSize').val());
			Model.set('Year', $('#SearchYear').val());

			var geo = $('#searchgeo').val();
			if (geo.length == 0)
				return;
			Model.search(geo);
		},
		resetMapHeaderSize : function() {
			var headerContainer = $('#ListingsMapHeader');
			var isTableTooWide = this.__getMapHeaderTableWidth();
			if (isTableTooWide) {
				this.__createFilterDropdown();
			}
		},
		__getMinMax : function() {
			var min = $('#SearchPriceFrom').val();
			var max = $('#SearchPriceTo').val();
			if (min == "Any")
				min = 0;
			else
				min = parseInt(min);
			if (max == "Any")
				max = 99999999;
			else
				max = parseInt(max);
			if (min > max) {
				var tmp = max;
				max = min;
				min = tmp;
			}
			if ((min == 0) || (min == 99999999))
				min = "Any";
			if ((max == 0) || (max == 99999999))
				max = "Any";
			var minmax = {};
			minmax.min = min.toString();
			minmax.max = max.toString();
			return minmax;
		},
		__renderActiveFilter : function() {
			if (this.__hasActiveFilters()) {
				var that = this;
				$('#FBV').show();
				$('#ListingsSearchResetButton').show();
				var isTableTooWide = this.__getMapHeaderTableWidth();
				if (isTableTooWide) {
					that.__createFilterDropdown();
				}
			} else {
				$('#FBV').hide();
				$('#ListingsSearchResetButton').hide();
			}
		},
		__hasActiveFilters : function() {
			var isFilterActive = false;
			if (Model.get('PriceFrom') != "Any" && Model.get('PriceTo') != "Any") {
				isFilterActive = true;
				var filter = '$' + Utility.nFormatter(Model.get('PriceFrom')) + ' - ' + '$' + Utility.nFormatter(Model.get('PriceTo'));
				$('#FilterFromTo').text(filter).show();
			} else if (Model.get('PriceFrom') != "Any") {
				isFilterActive = true;
				var filter = '$' + Utility.nFormatter(Model.get('PriceFrom'));
				$('#FilterFromTo').text(filter).show();
			} else if (Model.get('PriceTo') != "Any") {
				isFilterActive = true;
				var filter = '$' + Utility.nFormatter(Model.get('PriceTo'));
				$('#FilterFromTo').text(filter).show();
			} else {
				$('#FilterFromTo').hide();
			}
			if (Model.get('BedBth') != "Any") {
				var filter = "";
				isFilterActive = true;
				var tokens = Model.get('BedBth').split('.');
				filter += sprintf('%s/%s', tokens[0], tokens[1]);
				$('#FilterBedBath').text($.trim(filter + ' Bd/Bh')).show();
			} else {
				$('#FilterBedBath').hide();
			}
			if (Model.get('Type') != "Any") {
				var filter = "";
				isFilterActive = true;
				var type = 'SFR';
				if (Model.get('Type') == 2)
					type = 'Condo';
				filter += type;
				$('#FilterType').text($.trim(filter + ' Type')).show();
			} else {
				$('#FilterType').hide();
			}
			if (Model.get('SqFoot') != "Any") {
				var filter = "";
				isFilterActive = true;
				filter += Utility.formatNumberThousands(Model.get('SqFoot'));
				$('#FilterSqFoot').text($.trim(filter + '+' + ' SqFt')).show();
			} else {
				$('#FilterSqFoot').hide();
			}
			if (Model.get('LotSize') != "Any") {
				var filter = "";
				isFilterActive = true;
				filter += Utility.formatNumberThousands(Model.get('LotSize'));
				$('#FilterLotSize').text($.trim(filter + '+' + ' Lot')).show();
			} else {
				$('#FilterLotSize').hide();
			}
			if (Model.get('Year') != "Any") {
				var text;
				var filter = "";
				var year = Model.get('Year');
				if (year > 1) {
					text = ' Yrs';
				} else {
					text = ' Yr';
				}
				isFilterActive = true;
				filter += sprintf('< %s', year);
				$('#FilterYear').text($.trim(filter + text)).show();
			} else {
				$('#FilterYear').hide();
			}
			return isFilterActive;
		},
		__setupHandlers : function() {
			var that = this;
			Model.fetch().done(function(response) {
				that.__initTypeahead(response);
			});
			$("#ListingsSearchOptions").click(this.onToggleOptions);
			$("#SearchPriceFrom").select2();
			$("#SearchPriceTo").select2();
			$('#SearchBedBth').select2();
			$('#SearchType').select2();
			$('#SearchSqFoot').select2();
			$('#SearchLotSize').select2();
			$('#SearchYear').select2();
			$("#ListingsFindDealsButton").click(function(e) {
				e.preventDefault();
				that.onSearch();
			});
			$("#ListingsSearchFilterReset").click(function(e) {
				e.preventDefault();
				that.onFilterReset();
				that.onSearch();
			});
			$("#ListingsSearchResetButton").click(function(e) {
				e.preventDefault();
				that.onFilterReset();
			});
			var geo = Router.getGeo();
			if (( typeof geo === 'string') && (geo.indexOf("%20") > -1)) {
				var geosplit = geo.split('%20');
				for ( i = 0; i < geosplit.length; i++) {
					if (geo.indexOf("%20") > -1) {
						geo = geo.replace('%20', ' ');
					}
				}
			}
			$('#searchgeo').val(geo);
			this.__initializeFromModel();
		},
		__initTypeahead : function(response) {
			var substringMatcher = function(strs) {
				return function findMatches(q, cb) {
					var matches, substrRegex;
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
		__initializeFromModel : function() {
			$("#SearchPriceFrom").select2().val(Model.get('PriceFrom')).trigger('change');
			$("#SearchPriceTo").select2().val(Model.get('PriceTo')).trigger('change');
			$("#SearchBedBth").select2().val(Model.get('BedBth')).trigger('change');
			$("#SearchType").select2().val(Model.get('Type')).trigger('change');
			$("#SearchSqFoot").select2().val(Model.get('SqFoot')).trigger('change');
			$("#SearchLotSize").select2().val(Model.get('LotSize')).trigger('change');
			$("#SearchYear").select2().val(Model.get('Year')).trigger('change');
		},
		__getMapHeaderTableWidth : function() {
			var MaxWidth = $('div#ListingsMapHeader').outerWidth();
			var TableWidth = $('tr#FBV').outerWidth() + $('tr#TFBV').outerWidth();
			if (TableWidth >= MaxWidth) {
				return true;
			}
			return false;
		},
		__createFilterDropdown : function() {
			if ($('td#DynamicParentFilterMore').length > 0) {
				return;
			}
			var dropdownElem = $('<td id="DynamicParentFilterMore" class="dropdown" style="padding-left: 8px;"></span>');
			dropdownElem.append($('<a href="" data-toggle="dropdown" class="dropdown-toggle" data-bypass>More <b class="caret"></b></a>'));
			var ulElem = $('<ul id="DynamicFilterMore" class="dropdown-menu" style="min-width: 120px;text-align: center;right: 0;left: -60px;"></ul>');
			var childs = $('#FBV').find('.FilterBarValues');
			for ( i = 0; i < childs.length; i++) {
				if (i > 1) {
					var child = $(childs[i]);
					var lastChild = child.clone();
					child.hide();
					ulElem.append($('<li style="text-align:center;float:right;"></li>').append(lastChild));
				}
			}
			dropdownElem.append(ulElem);
			dropdownElem.insertAfter("#FBV td#FilterYear");
		}
	});
});
