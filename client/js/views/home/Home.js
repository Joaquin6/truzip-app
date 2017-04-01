define(['jquery', 'underscore', 'backbone', 'events', 'utility', 'text!templates/home/HomeTemplate.html'], function($, _, Backbone, Events, Utility, Template) {
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
			require(['views/home/HomeHeaderView', 'views/home/HomeSearchView', 'views/home/HowItWorksView', 'views/home/ContactsView', 'views/FooterView', 'views/DialogsView', 'views/workflows/WelcomeView'], function(HeaderView, HomeSearchView, HowitworksView, ContactsView, FooterView, DialogsView, WelcomeView) {
				var view = new HeaderView();
				view.render();
				view = new HomeSearchView();
				view.render();
				view = new HowitworksView();
				view.render();
				view = new ContactsView();
				view.render();
				view = new FooterView();
				view.render();
				view = new DialogsView();
				view.render();
				view = new WelcomeView();
			});
		},
		__handleHeadTags : function() {
			var tagObj = Utility.getHeadTags();
			tagObj.nodes.metaTag.attr('content', tagObj.metaContent);
			tagObj.nodes.titleTag.text(tagObj.titleContent);
		}
	});
});
