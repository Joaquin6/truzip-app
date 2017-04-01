define(['jquery'], function($) {
	var tracking = Backbone.View.extend({
		track : function() {
			window.google_trackConversion({
				google_conversion_id : 1008445391,
				google_conversion_language : "en",
				google_conversion_format : "3",
				google_conversion_color : "ffffff",
				google_conversion_label : "YJOjCPGouwoQz8_u4AM",
				google_remarketing_only : false
			});
		}
	});
	return new tracking();
});
