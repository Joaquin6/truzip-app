define(['jquery', 'underscore', 'backbone', 'select2', 'events', 'utility', 'router', 'views/ModalView', 'models/SearchModel', 'text!templates/home/ContactsTemplate.html'], function($, _, Backbone, Select2, Events, Utility, Router, ModalView, SearchModel, Template) {
	return Backbone.View.extend({
		__dialog : null,
		el : "#contacts",
		events : {
			"click #ContactUsEmailBtn" : function(e) {
				e.preventDefault();
				$('div.navbar-header .text-center a').click();
				var that = this;
				setTimeout(function() {
					that.__sendContactUsEmail();
				}, 750);
			}
		},
		render : function() {
			this.$el.html(Template);
		},
		initialize : function(options) {
			this.listenTo(Events, Events.dispose, this.onDispose);
			SearchModel.on({
				"change:selectData" : this.__bindSelectData
			});
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		__bindSelectData : function() {
			var selectdata = SearchModel.getSelectData();
			$('#ContactsUsCitiesOfInterest').select2({
				data: selectdata,
				placeholder: 'City (Cities) of Interest',
				allowClear: true,
				selectOnClose: true,
				maximumSelectionLength: 3,
				minimumResultsForSearch: Infinity
			});
		},
		__sendContactUsEmail : function() {
			var email = $('#ContactsUsEmail').val();
			if (!Utility.validateEmail(email))
				return;

			// save email in cookie - so when he goes to listings page - we don't pop signin dialog
			var json = {};
			json.email = email;
			Utility.setPersistence('signin', json);

			var payload = {};
			payload.multiSelect = false;
			payload.email = email;
			var radio = $("input[name='interested']:checked").val();
			if (radio == "Buying")
				payload.action = "MainBuyForLess";
			else
				payload.action = "MainSellForMore";
			payload.name = $('#ContactUsName').val();
			payload.interest = $('#ContactsUsCitiesOfInterest').val();
			if (payload.interest.length > 1) {
				payload.multiSelect = true;
				this.__handleMultiSelect(payload);
			} else if (payload.interest.length === 1)
				payload.interest = payload.interest[0];
			payload.message = $('#ContactsUsMessage').val();
			if (payload.name.length === 0 || payload.interest.length === 0 || payload.message.length === 0)
				return;
			payload.geo = Router.getGeo();
			if (payload.geo === null)
				payload.geo = payload.interest[0];
			payload.search = Router.getLocation();

			this.__submitMessages(payload);
		},
		__submitMessages : function(payload) {
			Utility.contactAgent(payload).then(function(agentMessage) {
				if (agentMessage.agentID)
					payload.agent = agentMessage.agentID;
				Utility.welcomeUser(payload).then(function(userMessage) {
					console.log('Both Messages Sent Successfully!');
				}).fail(function(err) {
					console.log(err);
				}).done();
			}).fail(function(err) {
				console.log(err);
			}).done();
			this.__launchSubmittedDialog();
		},
		__launchSubmittedDialog : function() {
			var dialogTitle = _.template($('#tzDialogTitle').html())({
				title : 'Contact Request Submitted'
			});
			if (this.__dialog)
				this.__dialog.destroy();
			this.__dialog = new ModalView({
				id : 'ContactAgentSubmittedDialog',
				title : dialogTitle,
				body : $('#ContactAgentSubmittedDialogBody').html(),
				footer : $('#ContactAgentSubmittedDialogFooter').html()
			});
			this.__dialog.render();
		},
		__handleMultiSelect : function(payload) {
			if (!payload.multiSelect)
				return;
			var intre = [];
			var numofCities = payload.interest.length;
			var cities = '';
			for (var q = 0; q < payload.interest.length; q++) {
				intre.push(payload.interest[q]);
				if (q === 0) {
					cities += payload.interest[q]; 	// first time
					continue;
				}
				var count = numofCities - q;
				if (count === 1)
					cities += ' and ' + payload.interest[q]; // last time
				else
					cities += ', ' + payload.interest[q];
			}
			payload.multiInterest = cities;
			payload.interest = intre;
		}
	});
});
