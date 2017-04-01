define(['jquery', 'text!templates/helpers/FacebookTrackingTemplate.html'], function($, Template) {
	var tracking = Backbone.View.extend({
		__added : false,
		track : function() {
			if (this.__added) {
				fbq('track', "Purchase");
				return;
			}
			$('head').append(Template);
			this.__added = true;
		}
	});
	return new tracking();
});
