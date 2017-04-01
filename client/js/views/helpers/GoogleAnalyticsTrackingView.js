define(['jquery'], function($) {
	var tracking = Backbone.View.extend({
		track : function(page, title) {
			// this assume's that analytics code is loaded in index.html as global
			ga('set', {
				page : page,
				title : title
			});
			ga('send', 'pageview');
		},
		evt : function(category, action) {
			ga('send', 'event', {
				'eventCategory' : category,
				'eventAction' : action
			});
		}
	});
	return new tracking();
});
