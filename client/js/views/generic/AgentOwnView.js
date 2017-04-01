define(['jquery', 'underscore', 'backbone', 'jqueryform', 'typeahead', 'sprintf', 'spinner', 'jcarousel', 'events', 'utility', 'views/helpers/GoogleAnalyticsTrackingView', 'views/AlertsView', 'views/ModalView', 'models/SearchModel', 'models/AgentOwnModel', 'text!templates/generic/AgentOwnTemplate.html'], function($, _, Backbone, nopJqueryForm, Typeahead, nopSprintf, Spinner, nopJCarousel, Events, Utility, GoogleAnalyticsTrackingView, AlertsView, ModalView, SearchModel, Model, Template) {
	return Backbone.View.extend({
		model : null,
		__alert : null,
		__modal : null,
		__spinner : null,
		__typeahead : null,
		__errorDialog : null,
		__checkoutContext : {
			zipcode : null,
			ad : {
				"name" : "",
				"contact" : "",
				"optional" : "",
				"image" : ""
			},
			agent : {
				"first" : "",
				"last" : "",
				"email" : ""
			}
		},
		el : "#Body",
		initialize : function() {
			this.model = new Model();
			var that = this;
			SearchModel.getZipCodes(function(response) {
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
			var that = this;
			this.__spinner = new Spinner();

			$('#checkoutHeadingTwo').find('a').disable(true);
			$('#checkoutHeadingThree').find('a').disable(true);
			$('body').on('click', 'a.disabled', function(e) {
				e.preventDefault();
			});
			$('#CheckAvailability').on('click', function(e) {
				e.preventDefault();
				that.__checkAvailability();
			});

			$('#contactSales').on('click', function(e) {
				e.preventDefault();
				that.__openContactSalesDialog();
			});

			$('#uploadForm').submit(function() {
				$("#status").empty().text("File is uploading...");
				$(this).ajaxSubmit({
					error : function(xhr) {
						$("#status").empty().text("There was an error uploading image. Please try again...");
						status('Error: ' + xhr.status);
					},
					success : function(response) {
						$("#status").empty().text("File uploaded!");
						that.__checkoutContext.ad.image = '/images/photos/' + response;
						$('#imagethumb').attr('src', that.__checkoutContext.ad.image);
					}
				});
				return false;
			});
			$('#CheckAvailabilityButton').click(function() {
				that.__resetStepOne();
			});
			$('#CheckDifferentZip').click(function() {
				$('#CheckAvailabilityButton').click();
			});
			$('#PurchaseZipcode').click(function() {
				GoogleAnalyticsTrackingView.evt('AgentOwn', 'Step1B');
				var payload = {};
				payload.subject = "From Agent Own Your Zip (Purchase)";
				payload.text = sprintf("Got a new potential agent: %s", JSON.stringify(that.__checkoutContext));
				Utility.contactAdmin(payload);
				that.__launchPurchasedDialog();
			});

			$(".newsticker").jCarouselLite({
				vertical : true,
				hoverPause : true,
				visible : 5,
				auto : 2000,
				speed : 2000
			});
		},
		__resetStepOne : function() {
			GoogleAnalyticsTrackingView.evt('AgentOwn', 'Check Different Zip');
			$('#chargingZips').val("");
			$('#checkoutCollapseOneB').hide();
		},
		__setupStepTwoHandlers : function() {

			var that = this;
			$('#finishCheckoutStepTwoBtn').on('click', function(e) {
				e.preventDefault();
				that.__checkoutContext.ad.name = $("#srcAgentName").val();
				that.__checkoutContext.ad.contact = $('#srcAgentContactInfo').val();
				that.__checkoutContext.ad.optional = $("#srcAgentOptionalInfo").val();
				// don't do any validation (FOR NOW)
				//				if (that.__checkoutContext.ad.name.length == 0 || that.__checkoutContext.ad.contact.length == 0 || that.__checkoutContext.ad.image.length == 0)
				//				return;
				GoogleAnalyticsTrackingView.evt('AgentOwn', 'Step2');
				that.__checkoutStepThree();
			});
			$("#srcAgentName").keyup(function() {
				$("#dstAgentName").val($(this).val());
			});
			$("#srcAgentContactInfo").keyup(function() {
				$("#dstAgentContactInfo").val($(this).val());
			});
			$("#srcAgentOptionalInfo").keyup(function() {
				$("#dstAgentOptionalInfo").val($(this).val());
			});
			$("#srcAgentDescription").keyup(function() {
				var count = $(this).val().length;
				if (count > 80) {
					var subString = $("#srcAgentDescription").val().substring(0, 80);
					$(this).val(subString);
				}
				var left = 80 - count;
				$('#srcAgentDescriptionCount').text(' - ' + left + ' characters left');
				$("#dstAgentDescription").text($("#srcAgentDescription").val());
			});
		},
		__setupStepThreeHandlers : function() {
			var model = this.model;
			var that = this;
			$('#finishCheckoutStepThreeBtn').on('click', function(e) {
				e.preventDefault();
				that.__checkoutContext.agent.first = $('#AgentFirstName').val();
				that.__checkoutContext.agent.last = $('#AgentLastName').val();
				that.__checkoutContext.agent.email = $('#AgentEmail').val();
				if (that.__checkoutContext.agent.first.length == 0 || that.__checkoutContext.agent.last.length == 0 || that.__checkoutContext.agent.email.length == 0)
					return;
				GoogleAnalyticsTrackingView.evt('AgentOwn', 'Step3');
				var payload = {};
				payload.subject = "From Agent Own Your Zip";
				payload.text = sprintf("Got a new potential agent: %s", JSON.stringify(that.__checkoutContext));
				Utility.contactAdmin(payload);
				that.__launchSubmittedDialog();
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
			alert.$el.insertAfter('#ZipAvailabilityInput');
			alert.render();
			this.__alert = alert;
		},
		__checkAvailability : function() {
			GoogleAnalyticsTrackingView.evt('AgentOwn', 'Step1');
			var selectedZip = $('#chargingZips').val();
			if (selectedZip.length == 0 || selectedZip == undefined) {
				var context = {};
				context.title = "No Zip Code!";
				context.message = "Enter a zipcode to check availability.";
				context.type = "warning";
				this.__showErrorAlert(context);
			} else {
				this.__closeAlert();
				var that = this;
				SearchModel.validateZipcode(selectedZip, function(zip) {
					if (zip) {
						that.__checkoutContext.zipcode = selectedZip;
						that.__checkoutStepTwo(zip);
					} else {
						GoogleAnalyticsTrackingView.evt('AgentOwn', 'CheckAvailability - Bad Zip ' + selectedZip);
						var context = {};
						context.title = "Zipcode Not Valid!";
						context.message = "Please nter a valid zipcode.";
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
		__checkoutStepOneB : function(zip) {
			$('#AlreadyTaken').text('We are sorry, the free version of zipcode ' + zip + ' is taken.');
			$('#PurchasedZip').text(zip);
			$('#checkoutCollapseOne').collapse('hide');
			$('#checkoutCollapseOneB').show();
		},
		__checkoutStepTwo : function() {
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
			$('#checkoutCollapseTwo').collapse('hide');
			var stepThreeLink = $('#checkoutHeadingThree').find('a');
			if ($(stepThreeLink).hasClass('disabled'))
				$(stepThreeLink).disable(false);
			if ($(stepThreeLink).hasClass('btn'))
				$(stepThreeLink).removeClass('btn');
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
			GoogleAnalyticsTrackingView.evt('AgentOwn', 'Contact Sales - Click');
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
				GoogleAnalyticsTrackingView.evt('AgentOwn', 'Contact Sales - Sent');
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
			Utility.track();
			this.__modal.render();
		},
		__launchPurchasedDialog : function() {
			var dialogTitle = _.template($('#tzDialogTitle').html())({
				title : 'Apologies'
			});
			var that = this;
			this.__modal = new ModalView({
				id : 'ContactAgentPurchasedDialog',
				title : dialogTitle,
				body : $('#ContactAgentPurchasedDialogBody').html(),
				footer : $('#ContactAgentSubmittedDialogFooter').html()
			});
			Utility.track();
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
			GoogleAnalyticsTrackingView.evt('AgentOwn', 'Success - Checkout');
		}
	});
});
