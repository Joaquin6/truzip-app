define(['jquery', 'underscore', 'backbone', 'utility', 'events', 'text!templates/listings/PropertyDetailsTemplate.html'], function($, _, Backbone, Utility, Events, Template) {
	return Backbone.View.extend({
		el : "#PropertyDetails",
		template : _.template(Template),
		events : {
			'click #ReadMoreLongDesc' : function() {
				$('#DetailsDesc').slideUp("slow");
			},
			'click #ReadLessLongDesc' : function() {
				$('#DetailsDesc').slideDown("slow");
			}
		},
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
			if (model == undefined) {
				// first time - render all internal controls
				this.loadWhyGoodDeal();
				return;
			}
			this.model = model;
			var bind = this.getBind();
			this.$el.html(this.template(bind));
		},
		getBind : function() {
			var that = this;
			var bind = {};
			var Model = this.model;
			var propertyType = Model.get('PropertyType');
			var description = Model.get('Description');
			if (description.length == 0){
				bind.Description = "Property Description is currently unavailable.";
				bind.LongDescription = null;
			} else {
				var strObj = that.descriptionLengthControl(description);
				if ((strObj.string1 != null) && (strObj.string2 != null)) {
					var readmoreLink = '<a id="ReadMoreLongDesc" class="accordion-toggle" data-toggle="collapse" data-parent="#accordionPropDesc" href="#CollapseDesc" data-bypass>Read More...</a>';
					var readlessLink = '<a id="ReadLessLongDesc" class="accordion-toggle" data-toggle="collapse" data-parent="#accordionPropDesc" href="#CollapseDesc" data-bypass>Read Less...</a>';
					bind.Description = strObj.string1 + ' ' + readmoreLink;
					bind.LongDescription = strObj.string1.concat(strObj.string2) + ' ' + readlessLink;
				} else {
					bind.Description = description;
					bind.LongDescription = 'Description is not too long';
				}
			}
			bind.PropertyType = Utility.getPropertyType(Model.get('PropertyType'));
			bind.LivingArea = Utility.formatNumberThousands(Model.get('LivingArea'));
			bind.Bedrooms = this.model.get('Bedrooms');
			bind.BathroomsFull = this.model.get('BathroomsFull');
			bind.PricePerSqFt = Utility.formatNumberThousands(Model.get('PricePerSqFt'));
			bind.LotSize = Utility.formatNumberThousands(Model.get('LotSize'));
			if (bind.LotSize === 0 || bind.LotSize === "0") {
				bind.LotSize = 'N/A';
				Model.set('LotSize', 'N/A');
			}
			bind.YearBuilt = Model.get('YearBuilt');
			bind.Address = Model.get('Address');
			return bind;
		},
		descriptionLengthControl : function(description) {
			var longDesc = {};
			longDesc.string1 = null;
			longDesc.string2 = null;
			if (description.length > 100) {
				longDesc.string1 = description.slice(0, 100);
				longDesc.string2 = description.slice(100);
			}
			return longDesc;
		},
		loadWhyGoodDeal : function() {
			require(['views/listings/PropertyDetailsWhyView'], function(PropertyDetailsWhyView) {
				var view = new PropertyDetailsWhyView();
				view.render();
			});
		}
	});
});
