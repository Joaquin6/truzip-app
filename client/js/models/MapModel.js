define(['jquery', 'underscore', 'backbone', 'router', 'events', 'utility', 'text!templates/listings/map/MapPopupContentTemplate.html'], function($, _, Backbone, Router, Events, Utility, PopupContentTemplate) {
	return Backbone.Model.extend({
		defaults : function() {
			return {
				mapdata : null,
				searchedBy : null
			};
		},
		url : '/geos',
		request : function(callback) {
			this.clear();
			var geo = Router.getGeo();
			if (geo != null) {
				var that = this;
				if (isNaN(parseInt(geo))) {
					//console.log('Searched By City Name');
					that.set('searchedBy', 'cityname');
				} else {
					//console.log('Searched By City Zipcode');
					that.set('searchedBy', 'zipcode');
				}
				this.url = '/geos/' + geo;
				this.fetch({
					success : function(data) {
						if ((data == null) || (data == undefined))
							return;
						if ((data.attributes[0] == undefined) ||
							(((data.attributes[0].City == null) || (data.attributes[0].City == undefined)) &&
							(data.attributes[0].County == null) || (data.attributes[0].County == undefined)))
							return;
						var sb = that.get('searchedBy');
						if ((sb != null) || (sb != undefined)) {
							data.attributes[0].searchedBy = sb;
						}
						that.set('mapdata', data.attributes);
					}
				}).done(callback);
			}
		},
		getSearchedBy : function() {
			var search = {};
			var data = this.get('mapdata');
			search.searchedBy = this.get('searchedBy');
			search.cityname = data[0].City;
			search.zipcode = data[0].Zip;
			return search;
		},
		getPopupContent : function(property, dealtype, yousave) {
			var content = _.template(PopupContentTemplate);
			var bind = {};
			bind.price = '$' + Utility.nFormatter(property.get('Price'));
			bind.bedrms = property.get('Bedrooms');
			bind.bathrms = property.get('BathroomsFull');
			bind.yousave = yousave;
			bind.dealtype = dealtype;
			bind.thumbnail = Utility.getImageUrl(property);
			bind.imgAltDesc = property.get('ImageAlternate');
			bind.totalPotentialImgs = Utility.getTotalPotentialImages(property);
			if (bind.totalPotentialImgs === 0)
				bind.totalPotentialImgs = null;

			content = content(bind);
			return content;
		}
	});
});
