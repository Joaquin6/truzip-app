define(['jquery', 'underscore', 'backbone', 'utility', 'events', 'text!templates/listings/PropertyTrendsTemplate.html'], function($, _, Backbone, Utility, Events, Template) {
	return Backbone.View.extend({
		el : "#PropertyTrends",
		template : _.template(Template),
		None : 0,
		BestDeal : 1,
		GoodDeal : 2,
		FairDeal : 3,
		initialize : function() {
			_.bindAll(this, 'render');
			this.listenTo(Events, Events.showDetails, this.onShowDetails);
			this.listenTo(Events, Events.dispose, this.onDispose);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		onShowDetails : function(model) {
			if (model.get('IsExcludeFromAlgo')) {
				this.$el.html(Template);
				$('#HelpMeBargain').hide();
			} else {
				var bind = this.getBind(model);
				this.$el.html(this.template(bind));
				$('#HelpMeBargain').show();
			}
			return this;
		},
		getBind : function(model) {
			var bucket = 0;
			if (model.get('Price') <= 500000)
				bucket = 0;
			else if (model.get('Price') <= 1000000)
				bucket = 1;
			else if (model.get('Price') > 1000000)
				bucket = 2;

			// suggested offer - get lower of price or valuation (add / minus a percentage off it)
			var suggestedOffer = model.get('Price');
			if (model.get('ValuationPrice') < model.get('Price'))
				suggestedOffer = model.get('ValuationPrice');

			var mkt_type = "Neutral Market";
			suggestedOffer = Utility.round((suggestedOffer - (suggestedOffer * 0.03)), 0);
			// if (Property.SupplyDemand[bucket].MarketType == 0)
			// {
			// suggestedOffer = (int)(suggestedOffer - (suggestedOffer * 0.03));
			// mkt_type = "Neutral Market";
			// }
			// if (Property.SupplyDemand[bucket].MarketType == 1)
			// {
			// suggestedOffer = (int)(suggestedOffer - (suggestedOffer * 0.05));
			// mkt_type = "Buyers Market";
			// }
			// if (Property.SupplyDemand[bucket].MarketType == 2)
			// {
			// suggestedOffer = (int)(suggestedOffer - (suggestedOffer * 0.01));
			// mkt_type = "Sellers Market";
			// }

			var bind = {};
			bind.Price = Utility.formatCurrency(model.get('Price'));
			bind.ValuationPrice = Utility.formatCurrency(model.get('ValuationPrice'));
			bind.SuggestedOffer = "Under " + Utility.formatCurrency(suggestedOffer);
			bind.MarketType = mkt_type;
			// KERRIGAN: hold this off - until we get some data...
			// bind.MarketSupply = 999;
			// bind.MarketNegotiate = 999;
			// NOTE: removed this from template - add back when needed
			// <tr height="10px"></tr>
			// <tr>
			// <td>Months of Supply in ZipCode:</td>
			// <td>
			// <div class="bold">
			// {{ MarketSupply }}
			// </div></td>
			// </tr>
			// <tr>
			// <td>Ability To Negotiate in ZipCode:</td>
			// <td>
			// <div class="bold">
			// {{ MarketNegotiate }}
			// </div></td>
			// </tr>

			if (model.get('DealType') == this.GoodDeal)
				bind.MarketMarkerType = "MarketMarkerGood";
			else if (model.get('DealType') == this.FairDeal)
				bind.MarketMarkerType = "MarketMarkerFair";
			else
				bind.MarketMarkerType = "MarketMarkerAbove";
			bind.HelpMeBargainLow = Utility.formatCurrency(model.get('HelpMeBargainLow'));
			bind.HelpMeBargainHigh = Utility.formatCurrency(model.get('HelpMeBargainHigh'));

			return bind;
		}
	});
});
