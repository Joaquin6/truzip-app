define(['jquery', 'underscore', 'backbone', 'router', 'utility', 'text!templates/listings/property/PropertyImageSliderTemplate.html'], function($, _, Backbone, Router, Utility, PropertyImageSliderTemplate) {
	return Backbone.Model.extend({
		__propertyInfoEmail : null,
		initialize : function() {
			var price = this.get('Price');
			var cashback = Math.round(price * 0.012);
			this.set('CashBack', cashback);
			_.bindAll(this, '__notifyAgent');
		},
		sendPropertyDetails : function(userEmail) {
			var deferred = $.Deferred();
			var payload = this.__prepDataForEmail(userEmail);
			var that = this;
			Utility.sendPropertyDetails(payload).then(function(message) {
				that.__notifyAgent(message);
				var context = that.__getResponceContext(true, message);
				deferred.resolve(context);
			}, function(error) {
				var context = that.__getResponceContext(false, null);
				deferred.reject(context);
			}).done();
			return deferred.promise();
		},
		getNextImageUrl : function(failedURL, conclude) {
			var context = {};
			context.conclude = false;
			context.noImage = '/images/ListingsSidebarHouse.png';

			if (conclude) {
				context.conclude = conclude;
				return context;
			}

			var listings = this.get('Listings'),
				numOfListings = listings.length, i;

			for (i = 0; i < numOfListings; i++) {
				var listing = listings[i];
				if (!listing.ImageUrls && listing.TotalPotentialImages === 0) {
					context.conclude = true;
					continue;
				}
				if (listing.ImageUrls && listing.ImageUrls.length > 0) {
					var idx = _.indexOf(listing.ImageUrls, failedURL);
					idx = idx + 1;
					context.url = listing.ImageUrls[idx];
					if (context.url && context.conclude === true)
						context.conclude = false;
					else if (!context.url && context.conclude === false)
						context.conclude = true;
				}
			}

			return context;
		},
		setNoImage : function(noImage) {
			this.set('ImageUrl', noImage);
		},
		getSlideImageContent : function(urls, alter) {
			var content = _.template(PropertyImageSliderTemplate);
			var bind = {};
			bind.urls = urls;
			bind.alter = alter;

			content = content(bind);
			return content;
		},
		__notifyAgent : function(message) {
			var payload = this.__propertyInfoEmail;
			if (payload === null)
				payload = this.__prepDataForEmail(message.header.to);
			Utility.contactAgent(payload);
		},
		__prepDataForEmail : function(userEmail) {
			var data = _.clone(this.attributes);

			if (data.Comparables) {
				data.ComparableCount = data.Comparables.length;
				delete data.Comparables;
			}
			if (data.ComparablesIds)
				delete data.ComparablesIds;

			data.DealType = Utility.getDealType(this);
			if (!isNaN(data.HelpMeBargainLow))
				data.HelpMeBargainLow = Utility.formatCurrency(data.HelpMeBargainLow);
			if (!isNaN(data.HelpMeBargainHigh))
				data.HelpMeBargainHigh = Utility.formatCurrency(data.HelpMeBargainHigh);
			if (!isNaN(data.Price)) {
				data.SuggestedOffer = data.Price;
				data.Price = Utility.formatCurrency(data.Price);
			}
			if (data.ValuationPrice < data.SuggestedOffer)
				data.SuggestedOffer = data.ValuationPrice;
			data.SuggestedOffer = Utility.round((data.SuggestedOffer - (data.SuggestedOffer * 0.03)), 0);
			data.SuggestedOffer = Utility.formatCurrency(data.SuggestedOffer);
			if (!isNaN(data.ValuationPrice))
				data.ValuationPrice = Utility.formatCurrency(data.ValuationPrice);
			if (!isNaN(data.YouSave))
				data.YouSave = Utility.formatCurrency(data.YouSave);
			if (data.YearBuilt && data.MedianYearBuilt)
				data.YearBuiltDiff = data.YearBuilt - data.MedianYearBuilt;
			if (!isNaN(data.YearBuilt))
				data.YearBuilt = data.YearBuilt.toString();
			if (!isNaN(data.MedianYearBuilt))
				data.MedianYearBuilt = data.MedianYearBuilt.toString();
			if (data.YearBuiltDiff && !isNaN(data.YearBuiltDiff))
				data.YearBuiltDiff = data.YearBuiltDiff.toString();
			data.LatLng = [parseFloat(data.Latitude), parseFloat(data.Longitude)];

			if (data.PricePerSqFt && data.MedianPpsf)
				data.PpsfDiff = Utility.formatNumberThousands(data.PricePerSqFt - data.MedianPpsf);
			if (data.PricePerSqFt)
				data.PricePerSqFt = Utility.formatNumberThousands(data.PricePerSqFt);
			if (data.MedianPpsf)
				data.MedianPpsf = Utility.formatNumberThousands(data.MedianPpsf);

			if (data.LotSize && data.MedianLotSize)
				data.LotSizeDiff = Utility.formatNumberThousands(data.LotSize - data.MedianLotSize);
			if (data.LotSize)
				data.LotSize = Utility.formatNumberThousands(data.LotSize);
			if (data.MedianLotSize)
				data.MedianLotSize = Utility.formatNumberThousands(data.MedianLotSize);

			if (data.Bedrooms && data.MedianBedrooms)
				data.BedroomsDiff = Utility.formatNumberThousands(data.Bedrooms - data.MedianBedrooms);
			if (data.Bedrooms)
				data.Bedrooms = Utility.formatNumberThousands(data.Bedrooms);
			if (data.MedianBedrooms)
				data.MedianBedrooms = Utility.formatNumberThousands(data.MedianBedrooms);

			if (data.BathroomsFull && data.MedianBathrooms)
				data.BathroomsDiff = Utility.formatNumberThousands(data.BathroomsFull - data.MedianBathrooms);
			if (data.BathroomsFull)
				data.BathroomsFull = Utility.formatNumberThousands(data.BathroomsFull);
			if (data.MedianBathrooms)
				data.MedianBathrooms = Utility.formatNumberThousands(data.MedianBathrooms);

			data.email = userEmail;
			data.geo = Router.getGeo();
			data.search = Router.getLocation();
			data.filter = this.__getSearchPersistence();
			data.action = "PropertyContactAgent";

			this.__propertyInfoEmail = data;

			return data;
		},
		__getSearchPersistence : function() {
			var search = Utility.getPersistence('search');
			if (search == undefined)
				return null;
			else
				return JSON.stringify(search);
		},
		__getResponceContext : function(successful, message) {
			var context = {};
			if (successful) {
				context.title = 'Your Request has been Submitted!';
				context.body = 'You will be receiving an email shortly with the details on this property.';
				context.conclusion = 'Email will be sent to: ' + message.header.to;
			} else {
				context.title = 'Sorry! There was an Internal Error';
				context.body = 'Truzip Admin Personel have been notified of this Error!';
				context.conclusion = 'Please try again later.';
			}
			return context;
		}
	});
});
