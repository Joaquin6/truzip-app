define(['jquery', 'underscore', 'backbone', 'jqueryeasing', 'text!templates/home/HomeHeaderTemplate.html'], function($, _, Backbone, JqueryEasing, Template) {
	return Backbone.View.extend({
		el : "#Header",
		render : function() {
			this.$el.html(Template);
			this.initMoveMe();
		},
		initMoveMe : function() {
			$('div.navbar-header .text-center a').click(function(event){
				var $anchor = $(this);
				$('html, body').stop().animate({
					easing:'easeInOutQuad',
					scrollTop : $($anchor.attr('href')).offset().top
				}, 1000);
				event.preventDefault();
			});
		}
	});
});
