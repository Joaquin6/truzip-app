define(['jquery', 'underscore', 'backbone', 'router', 'events'], function($, _, Backbone, Router, Events) {
	return Backbone.Model.extend({
		url : '/deals',
		request : function(callback) {
			this.clear();
			var geo = Router.getGeo(),
			    that = this;
			if (geo == null)
				geo = "";
			var that = this;
			//geo = '91324';
			this.url = '/deals/' + geo;
			if (isNaN(parseInt(geo)))
				that.set('searchedBy', 'cityname');
			else
				that.set('searchedBy', 'zipcode');
			this.fetch({
				success : function(data) {
					if ((data == null) || (data == undefined))
						return;
					that.set('bestdeals', data.attributes);
				}
			}).done(callback);
		}
	});
});
