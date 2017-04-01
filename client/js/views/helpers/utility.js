define(['jquery', 'underscore', 'backbone'], function($, _, Backbone) {
	return {
		__queuedTasks : [],
		__frameId : null,
		__bestDeals : null,
		uniqueId : 1,
		initialize : function() {
			this.__patchCookie();
			this.__patchPolyFill();
		},
		__patchCookie : function() {
			/*!
			 * jQuery Cookie Plugin v1.4.1
			 * https://github.com/carhartl/jquery-cookie
			 *
			 * Copyright 2013 Klaus Hartl
			 * Released under the MIT license
			 */
			var pluses = /\+/g;
			/**
			 * [encode description]
			 * @param  {type} s [description]
			 * @return {type}   [description]
			 */
			function encode(s) {
				return config.raw ? s : encodeURIComponent(s);
			}

			/**
			 * [decode description]
			 * @param  {type} s [description]
			 * @return {type}   [description]
			 */
			function decode(s) {
				return config.raw ? s : decodeURIComponent(s);
			}

			/**
			 * [stringifyCookieValue description]
			 * @param  {type} value [description]
			 * @return {type}       [description]
			 */
			function stringifyCookieValue(value) {
				return encode(config.json ? JSON.stringify(value) : String(value));
			}

			/**
			 * [parseCookieValue description]
			 * @param  {type} s [description]
			 * @return {type}   [description]
			 */
			function parseCookieValue(s) {
				if (s.indexOf('"') === 0) {
					// This is a quoted cookie as according to RFC2068, unescape...
					s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
				}

				try {
					// Replace server-side written pluses with spaces.
					// If we can't decode the cookie, ignore it, it's unusable.
					// If we can't parse the cookie, ignore it, it's unusable.
					s = decodeURIComponent(s.replace(pluses, ' '));
					return config.json ? JSON.parse(s) : s;
				} catch(e) {
				}
			}

			/**
			 * [read description]
			 * @param  {type} s         [description]
			 * @param  {type} converter [description]
			 * @return {type}           [description]
			 */
			function read(s, converter) {
				var value = config.raw ? s : parseCookieValue(s);
				return $.isFunction(converter) ? converter(value) : value;
			}

			/**
			 * [cookie description]
			 * @param  {type} key     [description]
			 * @param  {type} value   [description]
			 * @param  {type} options [description]
			 * @return {type}         [description]
			 */
			var config = $.cookie = function(key, value, options) {

				// Write

				if (value !== undefined && !$.isFunction(value)) {
					options = $.extend({}, config.defaults, options);

					if ( typeof options.expires === 'number') {
						var days = options.expires,
						    t = options.expires = new Date();
						t.setTime(+t + days * 864e+5);
					}

					return (document.cookie = [encode(key), '=', stringifyCookieValue(value), options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
					options.path ? '; path=' + options.path : '', options.domain ? '; domain=' + options.domain : '', options.secure ? '; secure' : ''].join(''));
				}

				// Read

				var result = key ? undefined : {};

				// To prevent the for loop in the first place assign an empty array
				// in case there are no cookies at all. Also prevents odd result when
				// calling $.cookie().
				var cookies = document.cookie ? document.cookie.split('; ') : [];

				for (var i = 0,
				    l = cookies.length; i < l; i++) {
					var parts = cookies[i].split('=');
					var name = decode(parts.shift());
					var cookie = parts.join('=');

					if (key && key === name) {
						// If second argument (value) is a function it's a converter...
						result = read(cookie, value);
						break;
					}

					// Prevent storing a cookie that we couldn't decode.
					if (!key && ( cookie = read(cookie)) !== undefined) {
						result[name] = cookie;
					}
				}

				return result;
			};

			config.defaults = {};
			/**
			 * [removeCookie description]
			 * @param  {type} key     [description]
			 * @param  {type} options [description]
			 * @return {type}         [description]
			 */
			$.removeCookie = function(key, options) {
				if ($.cookie(key) === undefined) {
					return false;
				}

				// Must not alter options, thus extending a fresh object...
				$.cookie(key, '', $.extend({}, options, {
					expires : -1
				}));
				return !$.cookie(key);
			};
		},
		__patchPolyFill : function() {
			// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
			// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
			// requestAnimationFrame polyfill by Erik Möller
			// fixes from Paul Irish and Tino Zijdel
			( function() {
					var lastTime = 0;
					var vendors = ['ms', 'moz', 'webkit', 'o'];
					for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
						window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
						window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
					}

					if (!window.requestAnimationFrame)
						window.requestAnimationFrame = function(callback, element) {
							var currTime = new Date().getTime();
							var timeToCall = Math.max(0, 16 - (currTime - lastTime));
							var id = window.setTimeout(function() {
								callback(currTime + timeToCall);
							}, timeToCall);
							lastTime = currTime + timeToCall;
							return id;
						};

					if (!window.cancelAnimationFrame)
						window.cancelAnimationFrame = function(id) {
							clearTimeout(id);
						};
				}());
		},
		setPersistence : function(key, value, cookiename) {
			key = key.toLowerCase();
			try {
				var cookie = $.cookie("tzCookie");
				var jsonObject = new Object();
				if (cookie != undefined)
					jsonObject = JSON.parse(cookie);
				if (cookiename == undefined)
					cookiename = "default";
				if (jsonObject[cookiename] == undefined)
					jsonObject[cookiename] = {};
				jsonObject[cookiename][key] = value;
				var json = JSON.stringify(jsonObject);
				$.cookie('tzCookie', json);
				return true;
			} catch (e) {
				console.log('unable to set cookie value: ' + cookiename + ":" + key + ":" + value);
				console.log(e);
			}
			return false;
		},
		getPersistence : function(key, cookiename) {
			key = key.toLowerCase();
			var cookie = $.cookie("tzCookie");
			if (cookie == undefined)
				return undefined;
			if (cookiename == undefined)
				cookiename = "default";
			var jsonObject = JSON.parse(cookie);
			if (jsonObject[cookiename] == undefined)
				return undefined;
			return jsonObject[cookiename][key];
		},
		removePersistence : function(key, cookiename) {
			key = key.toLowerCase();
			var cookie = $.cookie("tzCookie");
			if (cookie == undefined)
				return false;
			if (cookiename == undefined)
				cookiename = "default";
			var jsonObject = JSON.parse(cookie);
			if (jsonObject[cookiename] == undefined)
				return false;
			delete jsonObject[cookiename][key];
			var json = JSON.stringify(jsonObject);
			$.cookie('tzCookie', json);
			return true;
		},
		existsPersistence : function(key, cookiename) {
			return this.getPersistence(key, cookiename) != undefined;
		},
		isNullOrEmpty : function(value) {
			if ((value == undefined) || (value == null) || (value == "null") || (value.length == 0)) {
				return true;
			} else {
				return false;
			}
		},
		toTitleCase : function(str) {
			return str.replace(/\w\S*/g, function(txt) {
				return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			});
		},
		round : function(value, decimals) {
			if (decimals == undefined || isNaN(decimals))
				decimals = 0;
			if (value == undefined || isNaN(value))
				return 0;
			return Number(value.toFixed(decimals));
		},
		nFormatter : function(val, precision) {
			if (precision == undefined)
				precision = 0;
			if (val >= 1000000000) {
				return (val / 1000000000).toFixed(precision).replace(/\.0$/, '') + 'G';
			}
			if (val >= 1000000) {
				return (val / 1000000).toFixed(precision).replace(/\.0$/, '') + 'M';
			}
			if (val >= 1000) {
				return (val / 1000).toFixed(precision).replace(/\.0$/, '') + 'K';
			}
			return val;
		},
		formatNumber : function(val) {
			if ( typeof val !== "number" || isNaN(val)) {
				return "";
			}
			return val.toString().replace(/\,/g, '');
		},
		isNumeric : function(val) {
			return !isNaN(parseFloat(val)) && isFinite(val);
		},
		formatNumberThousands : function(val) {
			return val.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
		},
		formatCurrency : function(val) {
			if (val >= 0)
				return '$' + this.formatComma(val);
			val = -val;
			return '-$' + this.formatComma(val);
		},
		formatComma : function(val) {
			if ( typeof val == "number")
				val = val.toString();
			return val.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
		},
		toNumber : function(val) {
			if ( typeof val == "number")
				return val;
			var num = val.replace(/\d+$/, "");
			if (num.length == 0)
				return 0;
			return parseInt(num);
		},
		currencyToNumber : function(val) {
			val = val.replace('$', '');
			return parseInt(val);
		},
		sortArray : function(array, item, asc) {
			if (asc) {
				array.sort(function(a, b) {
					return a[item] - b[item];
				});
			} else {
				array.sort(function(a, b) {
					return b[item] - a[item];
				});
			}
		},
		//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		//:::                                                                         :::
		//:::  This routine calculates the distance between two points (given the     :::
		//:::  latitude/longitude of those points). It is being used to calculate     :::
		//:::  the distance between two locations using GeoDataSource(TM) products    :::
		//:::                                                                         :::
		//:::  Definitions:                                                           :::
		//:::    South latitudes are negative, east longitudes are positive           :::
		//:::                                                                         :::
		//:::  Passed to function:                                                    :::
		//:::    lat1, lon1 = Latitude and Longitude of point 1 (in decimal degrees)  :::
		//:::    lat2, lon2 = Latitude and Longitude of point 2 (in decimal degrees)  :::
		//:::    unit = the unit you desire for results                               :::
		//:::           where: 'M' is statute miles                                   :::
		//:::                  'K' is kilometers (default)                            :::
		//:::                  'N' is nautical miles                                  :::
		//:::                                                                         :::
		//:::  Worldwide cities and other features databases with latitude longitude  :::
		//:::  are available at http://www.geodatasource.com                          :::
		//:::                                                                         :::
		//:::  For enquiries, please contact sales@geodatasource.com                  :::
		//:::                                                                         :::
		//:::  Official Web site: http://www.geodatasource.com                        :::
		//:::                                                                         :::
		//:::           GeoDataSource.com (C) All Rights Reserved 2014                :::
		//:::                                                                         :::
		//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		GetGeoDistance : function(lat1, lon1, lat2, lon2, unit) {
			if (unit == undefined)
				unit = 'M';
			var theta = lon1 - lon2;
			var dist = Math.Sin(deg2rad(lat1)) * Math.Sin(deg2rad(lat2)) + Math.Cos(deg2rad(lat1)) * Math.Cos(deg2rad(lat2)) * Math.Cos(deg2rad(theta));
			dist = Math.Acos(dist);
			dist = rad2deg(dist);
			dist = dist * 60 * 1.1515;
			if (unit == 'K') {
				dist = dist * 1.609344;
			} else if (unit == 'N') {
				dist = dist * 0.8684;
			}
			return (dist);
		},
		deg2rad : function(deg) {
			return (deg * Math.PI / 180.0);
		},
		rad2deg : function(rad) {
			return (rad / Math.PI * 180.0);
		},
		// BEGIN - SEND EMAILS
		contactAdmin : function(payload, callback) {
			var deferred = $.Deferred();
			payload.from = "info@truzip.com";
			payload.to = "info@truzip.com";
			$.ajax({
				type : 'POST',
				url : '/methods/email',
				data : payload
			}).done(function(data, status, jqXHR) {
				deferred.resolve(data);
			}).fail(function(error) {
				deferred.reject(error);
			});
			return deferred.promise();
		},
		contactAgent : function(payload) {
			var deferred = $.Deferred();
			$.ajax({
				type : 'POST',
				url : '/agents/contact',
				data : payload
			}).done(function(data, status, jqXHR) {
				deferred.resolve(data);
			}).fail(function(error) {
				deferred.reject(error);
			});
			return deferred.promise();
		},
		welcomeUser : function(payload) {
			var deferred = $.Deferred();
			$.ajax({
				type : 'POST',
				url : '/users/welcome',
				data : payload
			}).done(function(data, status, jqXHR) {
				deferred.resolve(data);
			}).fail(function(error) {
				deferred.reject(error);
			});
			return deferred.promise();
		},
		sendPropertyDetails : function(payload) {
			var deferred = $.Deferred();
			$.ajax({
				url : '/properties/getpropertyinfo',
				type : 'POST',
				data : payload
			}).done(function(data, status, jqXHR) {
				deferred.resolve(data);
			}).fail(function(error) {
				deferred.reject(error);
			});
			return deferred.promise();
		},
		saveSearch : function(payload) {
			var deferred = $.Deferred();
			$.ajax({
				url : '/users/search',
				type : 'POST',
				data : payload
			}).done(function(data, status, jqXHR) {
				deferred.resolve(data);
			}).fail(function(error) {
				deferred.reject(error);
			});
			return deferred.promise();
		},
		// END - SEND EMAILS
		validateEmail : function(email) {
			if (email.length == 0)
				return false;
			var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
			return re.test(email);
		},
		generateXML : function(kmlObj) {
			var cityname = kmlObj.CityName;
			var state = kmlObj.State;
			var zipcode = kmlObj.Zip;
			var zipCoords = kmlObj.KMLCoordinates;
			var xw = new XMLWriter('UTF-8');
			xw.formatting = 'indented';
			xw.writeStartDocument();
			xw.writeStartElement('kml');
			xw.writeAttributeString('xmlns', 'http://www.opengis.net/kml/2.2');
			xw.writeAttributeString('xmlns:gx', 'http://www.google.com/kml/ext/2.2');
			xw.writeStartElement('Document');
			xw.writeStartElement('Style');
			xw.writeAttributeString('id', 'transPoly');
			xw.writeStartElement('LineStyle');
			xw.writeElementString('color', '000000');
			xw.writeElementString('width', '1');
			xw.writeEndElement();
			xw.writeStartElement('PolyStyle');
			xw.writeElementString('color', '7dff0000');
			xw.writeEndElement();
			xw.writeEndElement();
			xw.writeStartElement('Placemark');
			xw.writeElementString('name', cityname + ', ' + state);
			xw.writeElementString('description', zipcode);
			xw.writeElementString('visibility', '0');
			xw.writeElementString('styleUrl', 'transPoly');
			xw.writeStartElement('Polygon');
			xw.writeElementString('extrude', '1');
			xw.writeElementString('altitudeMode', 'relativeToGround');
			xw.writeStartElement('outerBoundaryIs');
			xw.writeStartElement('LinearRing');
			xw.writeElementString('coordinates', zipCoords);
			xw.writeEndElement();
			xw.writeEndElement();
			xw.writeEndElement();
			xw.writeEndElement();
			xw.writeEndElement();
			xw.writeEndDocument();
			return xw.flush();
		},
		getKMLCoordinatesValues : function(kml) {
			var parsedKML = $.parseHTML(kml);
			var coordsElem = $(parsedKML).find('coordinates');
			var coords = coordsElem[0].innerText;
			if (coords == undefined) {
				coords = coordsElem[0].innerHTML;
			}
			return coords;
		},
		// BEGIN - RENDER MANAGER
		ClearRenderQueue : function() {
			this.__queuedTasks = [];
		},
		RenderQueue : function(callback, data) {
			var work = {};
			work.callback = callback;
			work.data = data;
			this.__queuedTasks.push(work);
			this.__requestWork();
		},
		__requestWork : function() {
			if (this.__queuedTasks.length == 0)
				return;
			if (this.__frameId != null)
				return;
			var that = this;
			this.__frameId = requestAnimationFrame(function() {
				cancelAnimationFrame(that.__frameId);
				// who knew javascript had a queue and stack built in? http://codetunnel.com/9-javascript-tips-you-may-not-know/
				var task = that.__queuedTasks.shift();
				task.callback(task.data);
				that.__wait();
			});
		},
		__wait : function() {
			var that = this;
			setTimeout(function() {
				that.__frameId = null;
				that.__requestWork();
			}, 150);
		},
		// END - RENDER MANAGER
		getImgAltDesc : function(address) {
			var tags = $('head').find('title').text();
			if (tags.length > 0) {
				var tag = tags.split(',');
				return address + ' - ' + tag[0];
			}
			return address;
		},
		isValidValuationPrice : function(valuation) {
			if ((valuation < 0) || (valuation > 999999999)) {
				return false;
			}
			return true;
		},
		getDealType : function(model) {
			var dealtype = null;
			var exclude = null;
			// test if model or basic json
			if ( model instanceof Backbone.Model) {
				exclude = model.get('IsExcludeFromAlgo');
				dealtype = model.get('DealType');
			} else {
				exclude = model.IsExcludeFromAlgo;
				dealtype = model.DealType;
			}
			if (exclude)
				return "";
			if (dealtype == 2)
				return " Good Deal";
			else if (dealtype == 3)
				return " Fair Deal";
			return " Above Market";
		},
		getDealTypeIcon : function(model) {
			var dealtype = null;
			var exclude = null;
			// test if model or basic json
			if ( model instanceof Backbone.Model) {
				exclude = model.get('IsExcludeFromAlgo');
				dealtype = model.get('DealType');
			} else {
				exclude = model.IsExcludeFromAlgo;
				dealtype = model.DealType;
			}
			if (exclude)
				return "";
			if (dealtype == 2)
				return "GoodDealIcon";
			else if (dealtype == 3)
				return "FairDealIcon";
			return "RestDealIcon";
		},
		getImageUrl : function(model) {
			var listings = null;
			if ( model instanceof Backbone.Model)
				listings = model.get('Listings');
			else
				listings = model.Listings;
			for (var i = 0; i < listings.length; i++) {
				var listing = listings[i];
				if (listing.TotalPotentialImages > 0) {
					if (listing.ImageUrls && listing.ImageUrls.length > 0)
						return listing.ImageUrls[0];
				}
			}
			return "/images/ListingsSidebarHouse.png";
		},
		getTotalPotentialImages : function(model) {
			var listings = null;
			if ( model instanceof Backbone.Model)
				listings = model.get('Listings');
			else
				listings = model.Listings;
			for (var i = 0; i < listings.length; i++) {
				var listing = listings[i];
				if (listing.TotalPotentialImages > 0)
					return listing.TotalPotentialImages;
			}
			return 0;
		},
		getSliderImages : function(model) {
			var listings = null;
			if ( model instanceof Backbone.Model)
				listings = model.get('Listings');
			else
				listings = model.Listings;
			// get the listings that have the most images
			var imageCount = -1;
			var idx = -1;
			for (var i = 0; i < listings.length; i++) {
				var listing = listings[i];
				if (listing.TotalPotentialImages > 0) {
					if (listing.ImageUrls && listing.ImageUrls.length > imageCount) {
						imageCount = listing.ImageUrls.length;
						idx = i;
					}
				}
			}
			if (idx != -1) {
				var listing = listings[idx];
				if (listing.TotalPotentialImages > 0) {
					if (listing.ImageUrls && listing.ImageUrls.length > 0) {
						return listing.ImageUrls;
					}
				}
			}
			return "/images/ListingsSidebarHouse.png";
		},
		isGeoValid : function(latitude, longitude) {
			if (isNaN(latitude) || latitude == '' || isNaN(longitude) || longitude == '')
				return false;
			return true;
		},
		getCentroidOfLatLng : function(coords) {
			var lat = 0;
			var lng = 0;
			var total = 0;
			for (var i = 0; i < coords.length; ++i) {
				var coord = coords[i];
				if (!this.isGeoValid(coord.Lat, coord.Lng))
					continue;
				lat += parseFloat(coord.Lat);
				lng += parseFloat(coord.Lng);
				total++;
			}

			lat /= total;
			lng /= total;
			return {
				Lat : lat,
				Lng : lng
			};
		},
		formatURL : function(url) {
			return url.replace(/%20/g, '-').replace(/\s+/g, '-');
		},
		checkValidImage : function(str) {
			var parsedImg = $($.parseHTML(str)).find('img')[0];
			var naturalWidth = parsedImg.naturalWidth;
			var naturalHeight = parsedImg.naturalHeight;
			if (naturalHeight > 5 && naturalWidth > 5)
				return true;
			return false;
		},
		getHeadTags : function() {
			var head = $('head');
			var tagObj = {};
			tagObj.nodes = {};
			tagObj.nodes.metaTag = head.find('meta[name="description"]');
			tagObj.nodes.titleTag = head.find('title');

			var pathSplit = $(location).attr('pathname').split('/');
			for (var i = 0; i < pathSplit.length; i++) {
				tagObj.city = pathSplit[i];
				if (tagObj.city.length > 0 && tagObj.city != 'homes-for-sale') {
					if (isNaN(parseInt(tagObj.city)))
						tagObj.city = this.capitalizeFirstLetter(tagObj.city);
					tagObj.metaContent = 'See Bargain ' + tagObj.city + ' Homes For Sale. They Sell Upto 30% Faster.';
					tagObj.titleContent = 'Bargain ' + tagObj.city + ' Homes For Sale, ' + tagObj.city + ' Real Estate Deals | Truzip';
					break;
				}
			}

			return tagObj;
		},
		capitalizeFirstLetter : function(string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
		},
		isSidebarListingsItem : function($el) {
			var x = $el.closest('#ListingPropertyItem').find($el);
			if (x)
				return true;
			return false;
		},
		isExcluded : function(context) {
			// We are considering a property Bad if
			// Attribute 'IsHiddenDeal' is true, or if
			// Attribute 'IsExcludeFromAlgo' is true,
			// And if Lat and Lng are either -999 or "".
			//
			// This needs is needed because the sidebar will include them regardless if they have a bad
			// Lat/Lng. This causes problems because upon removing these layers from the map, the map only
			// sends out 15 properties excluded from Legend check boxes, and the sidebar bar has 17 total.
			// This is why we still saw properties on the sidebar when all check boxes were deselected from
			// legend.
			var Latitude,
			    Longitude,
			    IsHiddenDeal,
			    IsExcludeFromAlgo;
			if ( context instanceof Backbone.Model) {
				Latitude = context.get('Latitude');
				Longitude = context.get('Longitude');
				IsHiddenDeal = context.get('IsHiddenDeal');
				IsExcludeFromAlgo = context.get('IsExcludeFromAlgo');
			} else {
				Latitude = context.Latitude;
				Longitude = context.Longitude;
				IsHiddenDeal = context.IsHiddenDeal;
				IsExcludeFromAlgo = context.IsExcludeFromAlgo;
			}
			if (Latitude === undefined && context.attributes.Latitude)
				Latitude = context.attributes.Latitude;
			if (Longitude === undefined && context.attributes.Longitude)
				Longitude = context.attributes.Longitude;
			if (IsHiddenDeal === undefined && context.attributes.IsHiddenDeal)
				IsHiddenDeal = context.attributes.IsHiddenDeal;
			if (IsExcludeFromAlgo === undefined && context.attributes.IsExcludeFromAlgo)
				IsExcludeFromAlgo = context.attributes.IsExcludeFromAlgo;

			if (IsHiddenDeal || IsExcludeFromAlgo)
				return true;
			else if (parseFloat(Latitude) === -999 || parseFloat(Longitude) === -999)
				return true;
			else if (Latitude === "" || Longitude === "")
				return true;
			// True - exclude the property
			return false;
			// False - do not exclude the property
		},
		getPercentValue : function(num, perc) {
			return (perc / 100) * num;
		},
		stringifyPennyValue : function(qty, pennies) {
			if ( typeof qty == 'string')
				qty = parseInt(qty);
			if ( typeof pennies == 'string')
				pennies = parseInt(pennies);
			var fullAmnt = (pennies * qty) / 100;
			fullAmnt = fullAmnt.toString();
			if (fullAmnt.indexOf('.') > -1) {
				var fullAmntSplit = fullAmnt.split('.');
				if (fullAmntSplit[1].length == 1) {
					var cents = parseInt(fullAmntSplit[1]);
					if (cents < 9)
						fullAmntSplit[1] = '0' + cents.toString();
				} else if (fullAmntSplit[1].length > 2)
					fullAmntSplit[1] = fullAmntSplit[1].slice(0, 1);
				fullAmnt = fullAmntSplit[0] + '.' + fullAmntSplit[1];
			} else
				fullAmnt = fullAmnt + '.00';
			return '$' + fullAmnt;
		},
		populateEmail : function(element) {
			var user = this.getPersistence('signin');
			if (user)
				$(element).val(user.email);
		},
		getPropertyType : function(type) {
			if (type === 1)
				return 'SFR';
			// Single Family Residence
			else if (type === 2)
				return 'Condo';
			return 'N/A';
		},
		track : function() {
			require(['views/helpers/FacebookTrackingView', 'views/helpers/GoogleAdwordsTrackingView', 'views/helpers/TwitterTrackingView'], function(FacebookTrackingView, GoogleAdwordsTrackingView, TwitterTrackingView) {
				FacebookTrackingView.track();
				GoogleAdwordsTrackingView.track();
				TwitterTrackingView.track();
			});
		}
	};
});
