define(['jquery', 'underscore', 'backbone', 'events', 'utility', 'text!templates/listings/ListingsTemplate.html'], function($, _, Backbone, Events, Utility, Template) {
	return Backbone.View.extend({
		id : 'TzContainer',
		initialize : function(options) {
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.__handleHeadTags();
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			var that = this;
			$('body').append(this.$el.html(Template));
			require(['views/listings/ListingsHeaderView', 'views/FooterView', 'views/DialogsView', 'views/workflows/SignInView'], function(HeaderView, FooterView, DialogsView, SignInView) {
				var view = new HeaderView();
				view.render();
				view = new FooterView();
				view.render();
				view = new DialogsView();
				view.render();
				view = new SignInView();
				require(['views/listings/ListingsContainer'], function(ListingsContainer) {
					var container = new ListingsContainer();
					container.render();
				});
			});
		},
		__handleHeadTags : function() {
			var tagObj = Utility.getHeadTags();
			tagObj.nodes.metaTag.attr('content', tagObj.metaContent);
			tagObj.nodes.titleTag.text(tagObj.titleContent);
		}
	});
});
