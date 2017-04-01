define(['jquery', 'underscore', 'backbone', 'utility', 'events', 'text!templates/listings/PropertySchoolsTemplate.html'], function($, _, Backbone, Utility, Events, Template) {
	return Backbone.View.extend({
		el : "#PropertySchools",
		initialize : function() {
			_.bindAll(this, 'render');
			this.listenTo(Events, Events.showDetails, this.onShowDetails);
			this.listenTo(Events, Events.dispose, this.onDispose);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			this.$el.html(Template);
			return this;
		},
		onShowDetails : function(model) {
			var schools = model.get('schools');
			if (schools == undefined)
				return;
			$(this.el).find('tr:gt(1)').remove();
			var cloneElement = $(this.el).find('#clone');
			for (var i = 0; i < schools.length; i++) {
				var school = schools[i];
				var clone = $("<div />").append(cloneElement.clone()).html();
				var index = "IndexRest";
				if (school.Rating >= 9)
					index = "IndexBest";
				else if (school.Rating >= 5)
					index = "IndexGood";

				clone = clone.replace("{{Name}}", school.Name).replace("{{Rating}}", school.Rating).replace("{{Address}}", school.Address).replace("{{Index}}", index);

				var element = $(clone).removeAttr('id');
				element.show();
				$(this.el).find('tbody').append(element);
			}
		}
	});
});
