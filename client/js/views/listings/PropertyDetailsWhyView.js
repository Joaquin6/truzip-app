define(['jquery', 'underscore', 'backbone', 'utility', 'events', 'text!templates/listings/PropertyDetailsWhyTemplate.html'], function($, _, Backbone, Utility, Events, Template) {
	return Backbone.View.extend({
		el : ".PropertyDetailsWhy",
		template : _.template(Template),
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
			if (model == undefined)
				return;
			this.model = model;
			var bind = this.getBind();
			var elements = $('.PropertyDetailsWhy');
			for (var i = 0; i < elements.length; i++)
				$(elements[i]).html(this.template(bind));
		},
		getBind : function() {
			var bind = {};
			var dealtype = Utility.getDealType(this.model);
			bind.DealTypeTitle = 'Why' + dealtype + '?';

			bind.Bedrooms = this.model.get('Bedrooms');
			bind.MedianBedrooms = this.model.get('MedianBedrooms');
			bind.BedroomsDiff = this.model.get('Bedrooms') - this.model.get('MedianBedrooms');

			bind.BathroomsFull = this.model.get('BathroomsFull');
			bind.MedianBathrooms = this.model.get('MedianBathrooms');
			bind.BathroomsDiff = this.model.get('BathroomsFull') - this.model.get('MedianBathrooms');

			bind.PricePerSqFt = Utility.formatNumberThousands(this.model.get('PricePerSqFt'));
			bind.MedianPpsf = Utility.formatNumberThousands(this.model.get('MedianPpsf'));
			bind.PpsfDiff = Utility.formatNumberThousands(this.model.get('PricePerSqFt') - this.model.get('MedianPpsf'));

			bind.LotSize = this.model.get('LotSize');
			if (!isNaN(parseInt(bind.LotSize)))
				bind.LotSize = Utility.formatNumberThousands(bind.LotSize);
			bind.MedianLotSize = this.model.get('MedianLotSize');
			if (!isNaN(parseInt(bind.MedianLotSize))) {
				if (bind.MedianLotSize === 0) {
					bind.MedianLotSize = 'N/A';
					this.model.set('MedianLotSize', 'N/A');
				} else
					bind.MedianLotSize = Utility.formatNumberThousands(bind.MedianLotSize);
			}
			bind.LotSizeDiff = Utility.formatNumberThousands(this.model.get('LotSize') - this.model.get('MedianLotSize'));
			if (isNaN(parseInt(bind.LotSizeDiff))) {
				bind.LotSizeDiff = 'N/A';
				this.model.set('LotSizeDiff', 'N/A');
			}

			bind.YearBuilt = this.model.get('YearBuilt');
			bind.MedianYearBuilt = this.model.get('MedianYearBuilt');
			bind.YearBuiltDiff = this.model.get('YearBuilt') - this.model.get('MedianYearBuilt');

			bind.ComparableCount = this.model.get('Comparables').length;

			return bind;
		}
	});
});
