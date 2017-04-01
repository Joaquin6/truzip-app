define(['jquery', 'underscore', 'backbone', 'sprintf', 'router', 'utility'], function($, _, Backbone, nopSprintf, Router, Utility) {
	var Model = Backbone.Model.extend({
		__citynames : null,
		__zipcodes : null,
		__searchdata : null,
		__selectdata : null,
		url : '/geos/list',
		defaults : {
			PriceFrom : 'Any',
			PriceTo : 'Any',
			BedBth : 'Any',
			Type : 'Any',
			SqFoot : 'Any',
			LotSize : 'Any',
			Year : 'Any'
		},
		initialize : function() {
			var search = Utility.getPersistence('search');
			if (search == undefined)
				return;
			this.set('PriceFrom', search.PriceFrom);
			this.set('PriceTo', search.PriceTo);
			this.set('BedBth', search.BedBth);
			this.set('Type', search.Type);
			this.set('SqFoot', search.SqFoot);
			this.set('LotSize', search.LotSize);
			this.set('Year', search.Year);
		},
		request : function(callback) {
			var that = this;
			this.fetch().done(function(response) {
				that.__searchdata = response;
				callback(response);
				that.__prepSelectData(response);
			});
		},
		getData : function(callback) {
			if (this.__searchdata === null) {
				var that = this;
				this.request(function(response) {
					that.__searchdata = response;
					callback(response);
				});
			} else
				callback(this.__searchdata);
		},
		getSelectData : function() {
			return this.get('selectData');
		},
		resetFilters : function() {
			this.set('PriceFrom', 'Any');
			this.set('PriceTo', 'Any');
			this.set('BedBth', 'Any');
			this.set('Type', 'Any');
			this.set('SqFoot', 'Any');
			this.set('LotSize', 'Any');
			this.set('Year', 'Any');
		},
		search : function(geo) {
			geo = Utility.formatURL(geo);
			this.persistSearch(geo);
			var route = '#homes-for-sale/' + geo;
			if (geo == Router.getGeo())
				Backbone.history.fragment = null;
			Backbone.history.navigate(route, {
				trigger : true
			});
		},
		getRoute : function() {
			var route = this.__getRoute();
			var url = '/properties/' + Router.getGeo() + '?' + route.min + route.max + route.bed + route.bath + route.lot + route.sqfoot + route.year + route.type;
			return Utility.formatURL(url);
		},
		getPrettyRoute : function() {
			var route = this.__getRoute();
			var type = route.type.replace('&', '');
			if (type.length != 0) {
				if (type == 'type=1')
					type = "SFR";
				else if (type == 'type=2')
					type = "Condo";
			}
			var text = sprintf("Type: %s, %s %s %s %s %s %s %s", type, route.min.replace('&', ''), route.max.replace('&', ''), route.bed.replace('&', ''), route.bath.replace('&', ''), route.lot.replace('&', ''), route.sqfoot.replace('&', ''), route.year.replace('&', ''));
			return text;
		},
		getCityNames : function(callback) {
			var that = this;
			if (this.__citynames)
				return;
			this.fetch().done(function(response) {
				that.__processResponse(response);
				callback(response);
			});
		},
		getZipCodes : function(callback) {
			var that = this;
			if (this.__zipcodes)
				return;
			this.fetch().done(function(response) {
				that.__processResponse(response);
				callback(response);
			});
		},
		validateCityname : function(cityname, callback) {
			var validCityname = _.find(this.__citynames, function(city) {
				if (city.toLowerCase() === cityname.toLowerCase())
					return city;
			});
			if (!validCityname)
				validCityname = null;
			callback(validCityname);
		},
		validateZipcode : function(zipcode, callback) {
			var validZip = _.find(this.__zipcodes, function(zip) {
				if (zip === zipcode)
					return zip;
			});
			if (!validZip)
				validZip = null;
			callback(validZip);
		},
		__getRoute : function() {
			var route = {};
			//http://localhost/properties/91324?bed=3&bath=2&year=25&type=1&lot=500&sqfoot=2000&min=650000&max=700000
			route.min = '';
			if (this.get('PriceFrom') != undefined && this.get('PriceFrom') != null) {
				if (this.get('PriceFrom').toLowerCase() != 'any')
					route.min = '&min=' + this.get('PriceFrom');
			}
			route.max = '';
			if (this.get('PriceTo') != undefined && this.get('PriceTo') != null) {
				if (this.get('PriceTo').toLowerCase() != 'any')
					route.max = '&max=' + this.get('PriceTo');
			}
			route.bed = '';
			route.bath = '';
			if (this.get('BedBth') != undefined && this.get('BedBth') != null) {
				if (this.get('BedBth').toLowerCase() != 'any') {
					var token = this.get('BedBth').split('.');
					route.bed = '&bed=' + token[0];
					route.bath = '&bath=' + token[1];
				}
			}
			route.lot = '';
			if (this.get('LotSize') != undefined && this.get('LotSize') != null) {
				if (this.get('LotSize').toLowerCase() != 'any')
					route.lot = '&lot=' + this.get('LotSize');
			}
			route.sqfoot = '';
			if (this.get('SqFoot') != undefined && this.get('SqFoot') != null) {
				if (this.get('SqFoot').toLowerCase() != 'any')
					route.sqfoot = '&sqfoot=' + this.get('SqFoot');
			}
			route.year = '';
			if (this.get('Year') != undefined && this.get('Year') != null) {
				if (this.get('Year').toLowerCase() != 'any')
					route.year = '&year=' + this.get('Year');
			}
			route.type = '';
			if (this.get('Type') !== undefined && this.get('Type') != null) {
				if (this.get('Type').toLowerCase() != 'any')
					route.type = '&type=' + this.get('Type');
			}
			return route;
		},
		persistSearch : function(geo, payload) {
			var search = {};
			search.PriceFrom = this.get('PriceFrom');
			search.PriceTo = this.get('PriceTo');
			search.BedBth = this.get('BedBth');
			search.Type = this.get('Type');
			search.SqFoot = this.get('SqFoot');
			search.LotSize = this.get('LotSize');
			search.Year = this.get('Year');

			Utility.setPersistence('search', search);
			this.__saveSearchOnServer(geo, JSON.stringify(search), payload);
		},
		__processResponse : function(response) {
			this.__citynames = [];
			this.__zipcodes = [];
			for (var t = 0; t < response.length; t++) {
				if (isNaN(parseInt(response[t])))
					this.__citynames.push(response[t]);
				else
					this.__zipcodes.push(response[t]);
			}
		},
		__saveSearchOnServer : function(geo, filter, payload) {
			if (geo === undefined)
				geo = Router.getGeo();
			var signin = Utility.getPersistence('signin');
			if (signin === undefined)
				return;
			var data = {};
			data.geo = geo;
			data.email = signin.email;
			data.filter = filter;
			data.action = "UserSignIn";
			if (payload !== undefined && payload.agent)
				data.agent = payload.agent;
			Utility.saveSearch(data);
		},
		__prepSelectData : function(response, callback) {
			var selectData = [];
			for (var y = 0; y < response.length; y++) {
				if (!isNaN(parseInt(response[y])))
					continue;
				var geo = response[y].toString();
				selectData.push({
					id : geo,
					text : geo
				});
			}
			this.set('selectData', selectData);
		}
	});
	return new Model();
});
