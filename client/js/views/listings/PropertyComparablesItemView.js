define(['jquery', 'underscore', 'backbone', 'utility', 'events', 'text!templates/listings/PropertyComparablesItemTemplate.html'], function($, _, Backbone, Utility, Events, Template) {
	return Backbone.View.extend({
		model : null,
		template : _.template(Template),
		initialize : function(options) {
			if (options && options.model)
				this.model = options.model;
			_.bindAll(this, 'render');
			this.listenTo(Events, Events.dispose, this.onDispose);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			if (this.model == null)
				return;
			var bind = this.getBind(this.model);
			this.$el.html(this.template(bind));
			return this;
		},
		getBind : function(model) {
			var bind = {};
			// in this case model - is the raw JSON
			bind.Price = Utility.formatCurrency(model.Price);
			bind.YouSave = Utility.formatCurrency(model.YouSave);
			bind.LivingArea = model.LivingArea;
			if (!isNaN(parseInt(bind.LivingArea))) {
				if (bind.LivingArea === 0)
					bind.LivingArea = model.LivingArea = 'N/A';
				else
					bind.LivingArea = Utility.formatNumberThousands(bind.LivingArea);
			}
			bind.Bedrooms = model.Bedrooms;
			if (bind.Bedrooms === 0)
				bind.Bedrooms = null;
			bind.BathroomsFull = model.BathroomsFull;
			if (bind.BathroomsFull === 0)
				bind.BathroomsFull = null;
			bind.DealType = Utility.getDealType(model);
			bind.DealIcon = Utility.getDealTypeIcon(model);
			bind.LotSize = model.LotSize;
			if (!isNaN(parseInt(bind.LotSize))) {
				if (bind.LotSize === 0)
					bind.LotSize = model.LotSize = 'N/A';
				else
					bind.LotSize = Utility.formatNumberThousands(bind.LotSize);
			}
			bind.YearBuilt = model.YearBuilt;
			if (!isNaN(parseInt(bind.YearBuilt))) {
				if (bind.YearBuilt === 0)
					bind.YearBuilt = model.YearBuilt = 'N/A';
			}
			bind.ImageUrl = Utility.getImageUrl(model);
			if (model.YouSave < 0)
				bind.YouSaveVisibility = "none";
			else
				bind.YouSaveVisibility = "block";
			return bind;
		}
	});
});
