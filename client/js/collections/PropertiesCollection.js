define(['jquery', 'underscore', 'backbone', 'utility', 'models/SearchModel', 'models/PropertyModel'], function($, _, Backbone, Utility, SearchModel, Model) {
	var Collection = Backbone.Collection.extend({
		sort_key : '_id',
		__tooMany : false,
		hasSync : false,
		model : Model,
		url : '/properties',
		hasTooManyProperties : function() {
			return this.__tooMany;
		},
		request : function() {
			this.hasSync = false;
			this.reset();
			this.url = SearchModel.getRoute();
			this.fetch();
		},
		parse : function(response) {
			this.hasSync = true;
			this.__parseSchools(response);
			this.__parseComparables(response);
			if (response.properties.length == 300)
				this.__tooMany = true;
			else
				this.__tooMany = false;
			// Apperently this only checks if the image url value is null or undefined but
			// not if an image had an error loading. Therefore, we return properties
			// with bad imgUrl value at the end of the list.
			var properties = this.__reorderNoImageProperties(response.properties);
			return this.__reorderBadProperties(properties);
		},
		sortCollection : function(criteria) { // Custom sorting function.
			// Set your comparator function, pass the criteria.
			this.comparator = this.criteriaComparator(criteria);
			this.sort();
		},
		criteriaComparator : function(criteria, overloadParam) {
			return function(a, b) {
				var aSortVal = a.get(criteria);
				var bSortVal = b.get(criteria);
				// Whatever your sorting criteria.
				if (aSortVal < bSortVal)
					return -1;
				if (aSortVal > bSortVal)
					return 1;
				else
					return 0;
			};
		},
		getDealsCount : function() {
			var goodDeals = [], fairDeals = [], restDeals = [];
			for ( i = 0; i < this.models.length; i++) {
				var item = this.models[i];
				var isExcluded = Utility.isExcluded(item);
				if (!isExcluded) {
					var dealtype = item.get('DealType');
					if (dealtype == 2) {
						goodDeals.push(dealtype);
					} else if (dealtype == 3) {
						fairDeals.push(dealtype);
					} else {
						restDeals.push(dealtype);
					}
				}
			}
			var count = this.models.length;
			var deals = goodDeals.length + fairDeals.length;
			return {
				homes : count,
				totaldeals : deals,
				good : goodDeals.length,
				fair : fairDeals.length,
				rest : count - deals
			};
		},
		__reorderBadProperties : function(properties) {
			var list = [], badList = [];
			for (var i = 0; i < properties.length; i++) {
				if (properties[i].IsExcludeFromAlgo) {
					badList.push(properties[i]);
				} else {
					list.push(properties[i]);
				}
			}
			for (var i = 0; i < badList.length; i++)
				list.push(badList[i]);
			return list;
		},
		__reorderNoImageProperties : function(properties) {
			// push properties that have only 1 image to end
			var list = [], badList = [], that = this;
			for (var i = 0; i < properties.length; i++) {
				var property = properties[i];
				// Add an imageAlternate attribute to the property object
				if (property.Address && !property.imageAlternate)
					property.ImageAlternate = Utility.getImgAltDesc(property.Address);
				var image = Utility.getImageUrl(property);
				if (image == "/images/ListingsSidebarHouse.png")
					badList.push(property);
				else
					list.push(property);
			}
			for (var i = 0; i < badList.length; i++)
				list.push(badList[i]);
			return list;
		},
		__parseSchools : function(response) {
			var schoolsByZip = {};
			for (var i = 0; i < response.schools.length; i++) {
				var school = response.schools[i];
				school.Rating = this.__getSchoolRating(school.API);
				if (schoolsByZip[school.Zipcode.toString()] == undefined)
					schoolsByZip[school.Zipcode.toString()] = [];
				schoolsByZip[school.Zipcode.toString()].push(school);
			}
			for (var i = 0; i < response.properties.length; i++) {
				var properties = response.properties[i];
				properties.schools = schoolsByZip[properties.ZipCode];
			}
		},
		__parseComparables : function(response) {
			var propertyIds = {};
			for (var i = 0; i < response.properties.length; i++) {
				var property = response.properties[i];
				propertyIds[property._id] = property;
			}
			for (var i = 0; i < response.properties.length; i++) {
				var property = response.properties[i];
				property.Comparables = [];
				if (property.ComparablesIds) {
					for (var j = 0; j < property.ComparablesIds.length; j++) {
						var comparable = propertyIds[property.ComparablesIds[j]];
						if (comparable != undefined) {
							property.Comparables.push(comparable);
						}
					}
				}
				property.ComparablesIds = [];
			}
		},
		__getSchoolRating : function(API) {
			if (API < 500)
				return 1;
			if (API < 600)
				return 2;
			if (API < 650)
				return 3;
			if (API < 700)
				return 4;
			if (API < 750)
				return 5;
			if (API < 800)
				return 6;
			if (API < 850)
				return 7;
			if (API < 900)
				return 8;
			if (API < 930)
				return 9;
			return 10;
		}
	});
	return new Collection();
});
