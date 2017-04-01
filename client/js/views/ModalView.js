define(['jquery', 'underscore', 'backbone', 'events'], function($, _, Backbone, Events) {
	return Backbone.View.extend({
		className : "modal backbone-modal fade",
		template : _.template(['<div class="modal-script" {{ script }}>', '<div class="modal-dialog" {{ dialogStyle }}>', '	<div class="modal-content">', '		<div class="modal-header">', '			<button type="button" class="close" data-dismiss="modal">', '				<span class="glyphicon glyphicon-remove-circle"></span>', '			</button>', ' 			{{ title }}', '		</div>', '		<div class="modal-body">{{ body }}</div>', '		<div class="modal-footer">{{ footer }}</div>', '	</div>', '</div>', '</div>'].join("\n")),
		defaults : {
			backdrop : true,
			dialogStyle : null,
			hideCloseButton : false,
			hideFooter : false,
			title : "<h3>Info</h3>",
			body : '',
			footer : '',
			script : ''
		},
		events : {
			"show.bs.modal" : "onShow",
			"shown.bs.modal" : "onShown",
			"hide.bs.modal" : "onHide",
			"hidden.bs.modal" : "onHidden"
		},
		initialize : function(options) {
			options || ( options = {});
			_.extend(this, _.pick(options, _.keys(this.defaults)));
			_.bindAll(this, "close");
			this.__applyCallbacks(options);
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.on("close", function(view) {
				view.$el.modal('hide');
				view.destroy();
			});
		},
		render : function() {
			var data = this.model ? this.model.toJSON() : {};
			var that = this;
			var bind = this.__getBind();
			this.$el.html(this.template(bind));

			this.$dialog = this.$el.find('.modal-dialog');
			this.$content = this.$el.find('.modal-content');
			this.$header = this.$el.find('.modal-header');
			if (this.body && this.body.length > 0)
				this.$body = this.$el.find('.modal-body').children();
			else
				this.$body = this.$el.find('.modal-body');
			this.$footer = this.$el.find('.modal-footer');

			this.$el.modal({
				keyboard : false,
				backdrop : this.backdrop
			});

			if (this.hideCloseButton)
				this.$header.find('.close').hide();
			else
				this.$header.find(".close").off().click(that.close);

			if (this.backdrop === true)
				$('.modal-backdrop').off().click(that.close);

			this.postRender();

			return this;
		},
		close : function(e) {
			if (e)
				e.preventDefault();
			var that = this;
			if (!this.trigger)
				return;
			this.trigger("close", this);
			setTimeout(function() {
				that.$el.modal("hide");
				that.remove();
			}, 25);
		},
		onDispose : function() {
			this.destroy();
		},
		/**
		 * This method gets called everytime right AFTER the dialog has rendered.
		 * NOT Show/Shown but after it has been created in the DOM.
		 * @return {[type]} [description]
		 */
		postRender : function() {
			var slider = this.$body.find('.slick-slider').slick('getSlick');
			if (slider != null || slider != undefined)
				this.$slider = slider;
			return this;
		},
		/**
		 * This mthod gets called everytime AFTER the dialog has been 'hidden', or
		 * after animation of hiding has finished.
		 * @param  {[type]} e [description]
		 * @return {[type]}   [description]
		 */
		onHidden : function(e) {
			this.remove();
			this.__cleanUp();
		},
		/**
		 * Public method to be called to close dialog.
		 * @return {[type]} [description]
		 */
		hideModal : function() {
			this.$el.modal('hide');
			var that = this;
			setTimeout(function() {
				that.destroy();
			}, 50);
		},
		/**
		 * This method can be called publicly if we would not like to
		 * see any animation fade out from the modal. Itll just directly destroy.
		 * @return {[type]} [description]
		 */
		destroy : function() {
			this.remove();
			this.stopListening();
			this.__cleanUp();
		},
		update : function() {
			this.$el.modal('handleUpdate');
		},
		/**
		 * This method can be called publicly to resize the modal if its opened.
		 */
		resize : function() {
			this.$el.resize();
			this.$el.modal('handleUpdate');
		},
		__getBind : function() {
			var bind = {};
			if (this.dialogStyle)
				bind.dialogStyle = 'style=' + this.dialogStyle;
			else
				bind.dialogStyle = this.dialogStyle;
			bind.title = this.title;
			bind.body = this.body;
			bind.footer = this.footer;
			bind.script = this.script;
			return bind;
		},
		__applyCallbacks : function(options) {
			// Callbacks
			if ( typeof options.postRender == 'function')
				this.postRender = options.postRender;
			if ( typeof options.onShow == 'function')
				this.onShow = options.onShow;
			if ( typeof options.onShown == 'function')
				this.onShown = options.onShown;
			if ( typeof options.onHide == 'function')
				this.onHide = options.onHide;
			if ( typeof options.onHidden == 'function')
				this.onHidden = options.onHidden;
		},
		__cleanUp : function() {
			var $body = $('body');
			if ($body.find('.modal-backdrop').length > 0)
				$body.find('.modal-backdrop').remove();
			var that = this;
			setTimeout(function() {
				that.__cleanUpBody();
			}, 750);
		},
		__cleanUpBody : function() {
			var $body = $('body');
			if ($body.hasClass('modal-open')) {
				$body.removeClass('modal-open');
				$body.removeAttr('class');
			}
			var paddingStyle = $body.css('padding-right');
			if (paddingStyle != null || paddingStyle != undefined)
				$body.removeAttr('style');
		}
	});
});
