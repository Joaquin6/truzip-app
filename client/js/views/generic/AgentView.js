define(['jquery', 'underscore', 'backbone', 'stripe', 'typeahead', 'spinner', 'events', 'utility', 'views/helpers/GoogleAnalyticsTrackingView', 'views/AlertsView', 'views/ModalView', 'models/SearchModel', 'models/AgentModel', 'text!templates/generic/AgentTemplate.html'], function($, _, Backbone, Stripe, Typeahead, Spinner, Events, Utility, GoogleAnalyticsTrackingView, AlertsView, ModalView, SearchModel, Model, Template) {
	return Backbone.View.extend({
		model : null,
		__alert : null,
		__modal : null,
		__spinner : null,
		__typeahead : null,
		__errorDialog : null,
		__checkoutContext : {
			cities : null,
			numOfLeads : null,
			email : null
		},
		el : "#Body",
		initialize : function() {
			this.model = new Model();
			var that = this;
			SearchModel.getCityNames(function(response) {
				that.__initTypeahead(response);
			});
			this.model.on({
				"change:response" : that.__modelResponce
			}, this);
			this.model.onInitialized(function(model) {
				$('#chargingAmount').attr('max', model.get('total_plans'));
			});
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
		},
		render : function() {
			this.$el.html(Template);
			this.__setupHandlers();
		},
		onAfterCloseDialog : function() {
			this.__errorDialog.close();
			this.__errorDialog = null;
		},
		__initTypeahead : function(response) {
			var substringMatcher = function(strs) {
				return function findMatches(q, cb) {
					var matches;
					var substrRegex;
					// an array that will be populated with substring matches
					matches = [];
					// regex used to determine if a string contains the substring `q`
					substrRegex = new RegExp(q, 'i');
					// iterate through the pool of strings and for any string that
					// contains the substring `q`, add it to the `matches` array
					$.each(strs, function(i, str) {
						if (substrRegex.test(str)) {
							// the typeahead jQuery plugin expects suggestions to a
							// JavaScript object, refer to typeahead docs for more info
							matches.push({
								value : str
							});
						}
					});
					cb(matches);
				};
			};
			// var footer = "<strong>If you can't find your zipcode, try a city name!</strong>";
			var typeaHead = $('.typeahead').typeahead({
				name : 'zipcodes',
				local : response,
				hint : true,
				highlight : true,
				minLength : 3
			}, {
				source : substringMatcher(response)
			});
			this.__typeahead = typeaHead;
		},
		__setupHandlers : function() {
			this.__spinner = new Spinner();

			$('#checkoutHeadingTwo').find('a').disable(true);
			$('#checkoutHeadingThree').find('a').disable(true);
			$('body').on('click', 'a.disabled', function(e) {
				e.preventDefault();
			});

			var that = this;
			$('#CheckAvailability').on('click', function(e) {
				e.preventDefault();
				that.__checkAvailability();
			});

			$('#contactSales').on('click', function(e) {
				e.preventDefault();
				that.__openContactSalesDialog();
			});
		},
		__setupStepTwoHandlers : function() {
			$('.btn-number').click(function(e) {
				e.preventDefault();
				var fieldName = $(this).attr('data-field');
				var type = $(this).attr('data-type');
				var input = $("input[name='" + fieldName + "']");
				var currentVal = parseInt(input.val());
				if (!isNaN(currentVal)) {
					if (type == 'minus') {
						if (currentVal > input.attr('min')) {
							input.val(currentVal - 1).change();
						}
						if (parseInt(input.val()) == input.attr('min')) {
							$(this).attr('disabled', true);
						}
					} else if (type == 'plus') {
						if (currentVal < input.attr('max')) {
							input.val(currentVal + 1).change();
						}
						if (parseInt(input.val()) == input.attr('max')) {
							$(this).attr('disabled', true);
						}
					}
				} else {
					input.val(0);
				}
			});

			$('.input-number').focusin(function() {
				$(this).data('oldValue', $(this).val());
			});

			$('.input-number').change(function() {
				var minValue = parseInt($(this).attr('min'));
				var maxValue = parseInt($(this).attr('max'));
				var valueCurrent = parseInt($(this).val());
				var name = $(this).attr('name');
				if (valueCurrent >= minValue) {
					$(".btn-number[data-type='minus'][data-field='" + name + "']").removeAttr('disabled');
				} else {
					alert('Sorry, the minimum value was reached');
					$(this).val($(this).data('oldValue'));
				}
				if (valueCurrent <= maxValue) {
					$(".btn-number[data-type='plus'][data-field='" + name + "']").removeAttr('disabled');
				} else {
					alert('Sorry, the maximum value was reached');
					$(this).val($(this).data('oldValue'));
				}
			});

			$(".input-number").keydown(function(e) {
				// Allow: backspace, delete, tab, escape, enter and .
				if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 190]) !== -1 ||
				// Allow: Ctrl+A
				(e.keyCode == 65 && e.ctrlKey === true) ||
				// Allow: home, end, left, right
				(e.keyCode >= 35 && e.keyCode <= 39)) {
					// let it happen, don't do anything
					return;
				}
				// Ensure that it is a number and stop the keypress
				if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
					e.preventDefault();
				}
			});

			var that = this;
			$('#finishCheckoutStepTwoBtn').on('click', function(e) {
				e.preventDefault();
				var context = {};
				context.numOfLeads = $('#chargingAmount').val();
				that.__checkoutContext.numOfLeads = context.numOfLeads;
				context.email = $('#AgentInputEmail').val();
				if (context.email.length == 0)
					return;
				if (!Utility.validateEmail(context.email))
					return;
				GoogleAnalyticsTrackingView.evt('Agent', 'Step2');
				that.__checkoutContext.email = context.email;
				that.__checkoutStepThree(context);
			});
		},
		__setupStepThreeHandlers : function() {
			var model = this.model;
			var that = this;
			$('#subscribeBtn').on('click', function(e) {
				e.preventDefault();
				GoogleAnalyticsTrackingView.evt('Agent', 'Step3');
				var context = that.__checkoutContext;
				model.openCheckout(context);
			});
			// Close Checkout on page navigation
			$(window).on('popstate', function() {
				that.__trackOnCheckout();
				model.closeCheckout();
				return false;
			});
		},
		__showLoading : function(show) {
			if (show) {
				var body = document.getElementById('Body');
				this.__spinner.spin(body);
			} else
				this.__spinner.stop();
		},
		__showErrorAlert : function(context) {
			this.__closeAlert();
			var alert = new AlertsView({
				title : context.title,
				message : context.message,
				type : context.type,
				alertStyle : "margin-top:12px;"
			});
			alert.$el.insertAfter('#CityAvailabilityInput');
			alert.render();
			this.__alert = alert;
		},
		__checkAvailability : function() {
			GoogleAnalyticsTrackingView.evt('Agent', 'Step1');
			var selectedCity = $('#chargingCities').val();
			if (selectedCity.length == 0 || selectedCity == undefined) {
				var context = {};
				context.title = "No City Name!";
				context.message = "Enter a city name to check availability.";
				context.type = "warning";
				this.__showErrorAlert(context);
			} else {
				this.__closeAlert();
				var that = this;
				SearchModel.validateCityname(selectedCity, function(cityname) {
					if (cityname)
						that.__checkoutStepTwo(cityname);
					else {
						GoogleAnalyticsTrackingView.evt('Agent', 'CheckAvailability - Bad City ' + selectedCity);
						var context = {};
						context.title = "City Name Not Valid!";
						context.message = "Please enter a valid city name.";
						context.type = "warning";
						that.__showErrorAlert(context);
					}
				});
			}
		},
		__closeAlert : function() {
			if (this.__alert) {
				this.__alert.close();
				this.__alert = null;
			}
		},
		__checkoutStepTwo : function(cityname) {
			this.__checkoutContext.cities = cityname;
			$('#checkoutCollapseOne').collapse('hide');
			var stepTwoLink = $('#checkoutHeadingTwo').find('a');
			if ($(stepTwoLink).hasClass('disabled'))
				$(stepTwoLink).disable(false);
			if ($(stepTwoLink).hasClass('btn'))
				$(stepTwoLink).removeClass('btn');
			$('#checkoutCollapseTwo').collapse('show');
			this.__setupStepTwoHandlers();
		},
		__checkoutStepThree : function() {
			var context = this.__checkoutContext;
			$('#checkoutCollapseTwo').collapse('hide');
			var stepThreeLink = $('#checkoutHeadingThree').find('a');
			if ($(stepThreeLink).hasClass('disabled'))
				$(stepThreeLink).disable(false);
			if ($(stepThreeLink).hasClass('btn'))
				$(stepThreeLink).removeClass('btn');
			$('#cityConfirmCheckout').text(context.cities);
			$('#numofLeadsConfirmCheckout').text(context.numOfLeads);
			$('#emailConfirmCheckout').text(context.email);
			$('#checkoutCollapseThree').collapse('show');
			this.__setupStepThreeHandlers();
		},
		__modelResponce : function(model) {
			// here we will handle error responses from server
			var res = model.getResponse();
			if (res.status < 400)
				return;
			if (res.responseJSON)
				res = res.responseJSON;
			var errorTitle = _.template($('#tzDialogTitle').html())({
				title : res.title
			});
			var errorBody = _.template($('#ErrorDialogBody').html())({
				errorMessage : res.message
			});
			var that = this;
			this.__errorDialog = new ModalView({
				id : 'ErrorDialog',
				backdrop : 'static',
				title : errorTitle,
				body : errorBody,
				footer : $('#ErrorDialogFooter').html(),
				onHidden : function(e) {
					that.onAfterCloseDialog();
				}
			});
			this.__errorDialog.render();
		},
		__openContactSalesDialog : function() {
			GoogleAnalyticsTrackingView.evt('Agent', 'Contact Sales - Click');
			var dialogTitle = _.template($('#EmailUsDialogTitle').html())({
				title : 'Contact Sales'
			});
			var that = this;
			this.__modal = new ModalView({
				id : 'EmailUsDialog',
				title : dialogTitle,
				body : $('#ContactSalesDialogBody').html(),
				footer : $('#EmailUsDialogFooter').html(),
				onShown : function(e) {
					that.__bindEmailUs();
				}
			});
			this.__modal.render();
		},
		__bindEmailUs : function() {
			var sub = this.__data;
			var that = this;
			$('#EmailUsSubmit').off('click').on('click', function(e) {
				e.preventDefault();
				var email = $('#DialogsContactSalesEmail').val();
				if (email.length == 0)
					return;
				var message = $('#DialogsContactSalesText').val();
				if (message.length == 0)
					return;
				GoogleAnalyticsTrackingView.evt('Agent', 'Contact Sales - Sent');
				that.__contactAdmin(email, message);
			});
		},
		__closeModal : function() {
			this.__modal.close();
			this.__modal = null;
		},
		__launchSubmittedDialog : function() {
			var dialogTitle = _.template($('#tzDialogTitle').html())({
				title : 'Email Submitted'
			});
			var that = this;
			this.__modal = new ModalView({
				id : 'ContactAgentSubmittedDialog',
				title : dialogTitle,
				body : $('#ContactAgentSubmittedDialogBody').html(),
				footer : $('#ContactAgentSubmittedDialogFooter').html()
			});
			this.__modal.render();
		},
		__contactAdmin : function(email, message) {
			var model = this.model;
			var that = this;
			model.contactSales(email, message, function(status) {
				that.__closeModal();
				if (status === 'OK')
					that.__launchSubmittedDialog();
				else
					that.__launchErrorDialog();
			});
		},
		__launchErrorDialog : function() {
			var dialogTitle = _.template($('#tzDialogTitle').html())({
				title : 'Unable to Contact Sales'
			});
			var dialogBody = _.template($('#ErrorDialogBody').html())({
				errorMessage : 'An error occured while attempting to send your message. Truzip Admin and IT have been notified of this issue. Please try again later!'
			});
			var that = this;
			this.__modal = new ModalView({
				id : 'ContactSalesErrorDialog',
				title : dialogTitle,
				body : dialogBody,
				footer : $('#ErrorDialogFooter').html()
			});
			this.__modal.render();
		},
		__trackOnCheckout : function() {
			GoogleAnalyticsTrackingView.evt('Agent', 'Success - Checkout');
		}
	});
});
