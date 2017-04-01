define(['jquery', 'underscore', 'backbone', 'events', 'text!templates/generic/GenericTemplate.html'], function($, _, Backbone, Events, Template) {
	return Backbone.View.extend({
		id : 'Generic',
		initialize : function(options) {
			this.listenTo(Events, Events.dispose, this.onDispose);
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function(page) {
			$('body').append(this.$el.html(Template));
			switch (page) {
			case "AboutUs":
				this.renderAboutUs();
				break;
			case "FAQ":
				this.renderFAQ();
				break;
			case "Careers":
				this.renderCareers();
				break;
			case "Terms":
				this.renderTerms();
				break;
			case "Contact":
				this.renderContact();
				break;
			case "Agent":
				this.renderAgent();
				break;
			case "AgentOwn":
				this.renderAgentOwn();
				break;
			case "AgentSample":
				this.renderAgentSample();
				break;
			case "AgentPurchase":
				this.renderAgentPurchase();
				break;
			case "Confirmation":
				this.renderConfirmation();
				break;
			}
		},
		renderAboutUs : function() {
			require(['views/generic/GenericHeaderView', 'views/generic/AboutUsView', 'views/FooterView'], function(HeaderView, AboutUs, FooterView) {
				var view = new HeaderView();
				view.render();
				view = new AboutUs();
				view.render();
				view = new FooterView();
				view.render();
			});
		},
		renderFAQ : function() {
			require(['views/generic/GenericHeaderView', 'views/generic/FAQView', 'views/FooterView'], function(HeaderView, FAQ, FooterView) {
				var view = new HeaderView();
				view.render();
				view = new FAQ();
				view.render();
				view = new FooterView();
				view.render();
			});
		},
		renderCareers : function() {
			require(['views/generic/GenericHeaderView', 'views/generic/CareersView', 'views/FooterView'], function(HeaderView, Careers, FooterView) {
				var view = new HeaderView();
				view.render();
				view = new Careers();
				view.render();
				view = new FooterView();
				view.render();
			});
		},
		renderTerms : function() {
			require(['views/generic/GenericHeaderView', 'views/generic/TermsView', 'views/FooterView'], function(HeaderView, Terms, FooterView) {
				var view = new HeaderView();
				view.render();
				view = new Terms();
				view.render();
				view = new FooterView();
				view.render();
			});
		},
		renderContact : function() {
			require(['views/generic/GenericHeaderView', 'views/generic/ContactUsView', 'views/FooterView'], function(HeaderView, Contact, FooterView) {
				var view = new HeaderView();
				view.render();
				view = new Contact();
				view.render();
				view = new FooterView();
				view.render();
			});
		},
		renderAgent : function() {
			require(['views/generic/GenericHeaderView', 'views/generic/AgentView', 'views/FooterView', 'views/DialogsView'], function(HeaderView, Agent, FooterView, DialogsView) {
				var view = new HeaderView();
				view.render();
				view = new FooterView();
				view.render();
				view = new DialogsView();
				view.render();
				view = new Agent();
				view.render();
			});
		},
		renderAgentOwn : function() {
			require(['views/generic/GenericHeaderView', 'views/generic/AgentOwnView', 'views/FooterView', 'views/DialogsView'], function(HeaderView, Agent, FooterView, DialogsView) {
				var view = new HeaderView();
				view.render();
				view = new FooterView();
				view.render();
				view = new DialogsView();
				view.render();
				view = new Agent();
				view.render();
			});
		},
		renderAgentSample : function() {
			require(['views/generic/GenericHeaderView', 'views/generic/AgentSampleView', 'views/FooterView', 'views/DialogsView'], function(HeaderView, Agent, FooterView, DialogsView) {
				var view = new HeaderView();
				view.render();
				view = new FooterView();
				view.render();
				view = new DialogsView();
				view.render();
				view = new Agent();
				view.render();
			});
		},
		renderAgentPurchase : function() {
			require(['views/generic/GenericHeaderView', 'views/generic/AgentPurchaseView', 'views/FooterView', 'views/DialogsView'], function(HeaderView, Agent, FooterView, DialogsView) {
				var view = new HeaderView();
				view.render();
				view = new FooterView();
				view.render();
				view = new DialogsView();
				view.render();
				view = new Agent();
				view.render();
			});
		},
		renderConfirmation : function() {
			require(['views/generic/GenericHeaderView', 'views/generic/ConfirmationView', 'views/FooterView', 'views/DialogsView'], function(HeaderView, Confirmation, FooterView, DialogsView) {
				var view = new HeaderView();
				view.render();
				view = new FooterView();
				view.render();
				view = new DialogsView();
				view.render();
				view = new Confirmation();
			});
		}
	});
});
