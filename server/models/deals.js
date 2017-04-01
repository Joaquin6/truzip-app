var Q = require("q");
var Exception = require('../libs/utils').Exception;
var Utils = require('../libs/utils');
var Memcached = require('../libs/memcached');
var Geos = require('../routes/geos');
var Properties = require('./properties');
var config = require("../config.json");

module.exports = {
	initialize : function() {
		// every 24hrs - get new deals for select cities
	},
	fetch : function(geo, force) {
		var that = this;
		var deferred = Q.defer();
		var start = new Date();
		var safeGeo = geo == undefined ? "california" : geo;
		var dealCacheKey = geo == undefined ? "" : geo.replace(/ /g, '-');
		console.log(start + " - Deal fetch requested for: " + dealCacheKey);
		var MemcachedClient = Memcached.getInstance();
		MemcachedClient.get("deals_" + dealCacheKey, function(err, data) {
			if (err || (data == undefined) || force) {
				that.__fetchDeals(geo).then(function(deals) {
					that.__cacheDeal(dealCacheKey, start, deals);
					deferred.resolve(deals);
				}).fail(function(error) {
					console.log('try without filter now for geo: ' + geo);
					that.__fetchDeals(geo, false).then(function(deals) {
						that.__cacheDeal(dealCacheKey, start, deals);
						deferred.resolve(deals);
					}).fail(function(error) {
						console.log('unable to get deals for: ' + geo);
						deferred.resolve([]);
					});
				});
			} else {
				console.info("cache deal for: " + geo);
				deferred.resolve(data);
			}
		});
		return deferred.promise;
	},
	__fetchDeals : function(geo, applyFilter) {
		var that = this;
		var deferred = Q.defer();
		var promises = this.__getDealPromises(geo, applyFilter);
		Q.allSettled(promises).then(function(results) {
			var deals = [];
			results.forEach(function(result) {
				if (result.state === "fulfilled") {
					var propertyCount = result.value.length;
					if (propertyCount < 4) {
						var err = "too few deals found - remove filter (if exists) for: " + geo;
						console.log(err);
						deferred.reject(err);
					} else {
						var dealCount = that.__getDealCount(geo, result.value);
						var newDeals = that.__getBestDeals(result.value, dealCount);
						if (newDeals != null)
							deals.push.apply(deals, newDeals);
					}
				}
			});
			if (deals.length == 0) {
				var err = "no deals found for: " + geo;
				console.log(err);
				deferred.reject(err);
			} else {
				console.log('found ' + deals.length + ' deals for geo: ' + geo);
				that.__setCityName(deals);
				deferred.resolve(deals);
			}
		});
		return deferred.promise;
	},
	__cacheDeal : function(dealCacheKey, start, deals) {
		this.__cache("deals_" + dealCacheKey, deals);
		var now = new Date();
		var diff = now.getTime() - start.getTime();
		var dhm = Utils.daysHoursMinsFormat(diff);
		console.log(now + " - Deal fetched for: " + dealCacheKey + ", in " + dhm);
	},
	__setCityName : function(deals) {
		for (var i = 0; i < deals.length; i++) {
			var deal = deals[i];
			deal.City = Geos.getCity(deal.ZipCode);
		}
	},
	__getDealPromises : function(geo, applyFilter) {
		if (applyFilter == undefined)
			applyFilter = true;
		var promises = [];
		var didx = Math.floor(Math.random() * config.deals.length);
		var cities = config.deals[didx].cities;
		if (geo == undefined) {
			for (var i = 0; i < cities.length; i++) {
				// since for california the result set can be huge - always use a filter
				console.log('Fetching (California) Deal Promise for :' + cities[i].name);
				var promise = this.__getDealPromise(cities[i]);
				promises.push(promise);
			}
		} else {
			if (isNaN(geo)) {
				var promise = this.__getDealPromise(this.__getFilterCity(geo, applyFilter));
				promises.push(promise);
			} else {
				// guess it's just 1 zip - we want best deal for - so choose a random filter
				var cidx = Math.floor(Math.random() * cities.length);
				var city = cities[cidx];
				var filter = {};
				filter.name = geo;
				if (applyFilter) {
					filter.min = city.min;
					filter.max = city.max;
				}
				console.log("Random Zip filter choosen for geo: " + JSON.stringify(filter));
				var promise = this.__getDealPromise(filter);
				promises.push(promise);
			}
		}
		return promises;
	},
	__getDealCount : function(geo, properties) {
		// for california - deal count will be 11 - but we have 11 cities to go through - so we take 1 from every city - so same we want the top 1
		// if geo is defined - then just say we'd like the top 11
		// if undefined - this means it's across california - so return just 1 - since each city will return 1 (total of 11)
		if (geo == undefined)
			return 1;
		// if it's a single zip - then just return 1 property if < 10, 2 if < 20, else 3
		if (!isNaN(geo)) {
			if (properties.length < 10)
				return 1;
			if (properties.length < 20)
				return 2;
			return 3;
		}
		// this is just a city - so return top 5
		return 5;
	},
	__getDealPromise : function(filter) {
		var geoList = "";
		if (filter.name instanceof Array)
			geoList = filter.name;
		else {
			if (isNaN(filter.name)) {
				geoList = Geos.getZips(filter.name);
			} else
				geoList = [filter.name];
		}
		var promise = Properties.fetch(geoList, filter, false);
		return promise;
	},
	__getFilterCity : function(geo) {
		// do we have a configuration for this city? Is so use it's filter
		for (var i = 0; i < config.deals.length; i++) {
			var deal = config.deals[i];
			for (var j = 0; j < deal.cities.length; j++) {
				if (deal.cities[j].name == geo) {
					console.log("Found Filter to use: " + JSON.stringify(deal.cities[j]));
					return deal.cities[j];
				}
			}
		}
		// guess we didn't find a similar city - just use any city - and use it's filtering to generate a deal
		var didx = Math.floor(Math.random() * config.deals.length);
		var cidx = Math.floor(Math.random() * config.deals[didx].cities.length);
		var filter = config.deals[didx].cities[cidx];
		filter.name = geo;
		console.log("Random filter choosen for geo: " + JSON.stringify(filter));
		return filter;
	},
	__getBestDeal : function(properties) {
		var deals = this.__sortByBestDeal(properties);
		var deal = this.__getDeal(0, deals, []);
		if (deal != null)
			return deal;
		return null;
	},
	__getBestDeals : function(properties, dealCount) {
		if (properties.length == 0)
			return null;
		// critera for best deal - maybe most save? (with atleast 1 picture)
		if (dealCount == 1) {
			// get the best deal in the list of properties
			var bestDeal = this.__getBestDeal(properties);
			if (bestDeal == null)
				return null;
			return [bestDeal];
		} else {
			try {
				// split up these properties by zip
				var byZip = this.__splitPropertiesByZip(properties);
				// mix up the zips - and also sort the properties by you save
				var keys = Object.keys(byZip);
				keys = Utils.shuffle(keys);
				// now sort all properties by YouSave, by zip
				var sortByDealsZip = this.__sortByDealsZip(keys, byZip);
				// now iterate through the various properties by zip - and gather as many deals as is needed
				var bestDeals = [];
				var startIdx = 0;
				var noMoreDeals = {};
				// keep iterating through zips - until we have enough
				while (bestDeals.length < dealCount) {
					try {
						for (var i = 0; i < keys.length; i++) {
							var zip = keys[i];
							// keep looking for deals in this zip (if any left) - else ignore
							try {
								if (!noMoreDeals[zip]) {
									var deals = sortByDealsZip[zip];
									var deal = this.__getDeal(startIdx, deals, bestDeals);
									if (deal != null)
										bestDeals.push(deal);
									else
										noMoreDeals[zip] = true;
									if (bestDeals.length >= dealCount)
										break;
								}
							} catch(e) {
								console.log(e);
							}
						}
						startIdx++;
						// guess we have no more properties in range - so just return what we have
						if (this.__noMoreDealsLeft(noMoreDeals, keys))
							break;
					} catch (e) {
						console.log(e);
					}
				}
			} catch (e) {
				console.log(e);
			}
			return bestDeals;
		}
	},
	__noMoreDealsLeft : function(noMoreDeals, keys) {
		try {
			var noMoreDealsKeys = Object.keys(noMoreDeals);
			if (noMoreDealsKeys.length >= keys.length)
				return true;
		} catch (e) {
			console.log(e);
		}
		return false;
	},
	__getDeal : function(startIdx, properties, foundDeals) {
		// properties are now sorted by YouSave - but do a 2nd check and return first one that has images
		try {
			if (properties == null || properties.length == 0)
				return null;
			var bestDeal = properties[0];
			for (var i = startIdx; i < properties.length; i++) {
				var property = properties[i];
				if (property.Listings.length > 0) {
					for (var ii = 0; ii < property.Listings.length; ii++) {
						if (property.Listings[ii].ImageUrls == null)
							continue;
						if (property.Listings[ii].ImageUrls.length > 0) {
							if (property.YouSave < 0)
								continue;
							// before we return this property - is this already in our found deals list??
							if (!this.__isInList(property, foundDeals))
								return property;
						}
					}
				}
			}
		} catch (e) {
			console.log(e);
		}
		return null;
	},
	__isInList : function(property, list) {
		for (var i = 0; i < list.length; i++) {
			if (property.UniqueKey == list[i].UniqueKey)
				return true;
		}
		return false;
	},
	__splitPropertiesByZip : function(properties) {
		var byZip = {};
		for (var i = 0; i < properties.length; i++) {
			var property = properties[i];
			if (byZip[property.ZipCode] == undefined)
				byZip[property.ZipCode] = [];
			byZip[property.ZipCode].push(property);
		}
		return byZip;
	},
	__sortByDealsZip : function(keys, byZip) {
		var sortByDealZips = {};
		try {
			for (var i = 0; i < keys.length; i++) {
				var zip = keys[i];
				var deals = this.__sortByBestDeal(byZip[zip]);
				sortByDealZips[zip] = deals;
			}
		} catch (e) {
			console.log(e);
		}
		return sortByDealZips;
	},
	__sortByBestDeal : function(properties) {
		properties.sort(function(a, b) {
			if (b.YouSave > a.YouSave)
				return 1;
			if (b.YouSave < a.YouSave) {
				return -1;
			}
			return 0;
		});
		return properties;
	},
	__cache : function(geo, data) {
		Memcached.getInstance().set(geo, data, 60 * 60 * 23, function(err) {
			if (err)
				console.error(err);
		});
	}
};
