define(['jquery', 'text!templates/helpers/TwitterTrackingTemplate.html'], function($, Template) {
	var tracking = Backbone.View.extend({
		__added : false,
		track : function() {
			if (this.__added) {
				twq('track', 'PageView'); 
				return;
			}
			$('head').append(Template);
			this.__added = true;
		}
	});
	return new tracking();
});
