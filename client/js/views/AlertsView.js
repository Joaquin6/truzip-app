define(['jquery', 'underscore', 'backbone', 'events'], function($, _, Backbone, Events) {
	return Backbone.View.extend({
		className: "alert alert-dismissible",
		role : "alert",
		template: _.template([
			"<button id='AlertCloseBtn' type='button' class='close' data-dismiss='alert' aria-label='Close'>", 
			"	<span aria-hidden='true'>&times;</span>",
			"</button>",
			"<strong id='AlertTitle'>{{ title }}</strong> <p id='AlertMessage'>{{ message }}</p>"
        ].join("\n")),
        defaults: {
        	alertStyle : null,
            hideCloseButton : false,
            title : "Alert Title!",
            type : "info",
			message: 'alert message goes here!',
            postRender: function() {
            	return this;
            }
        },
		events : {
			"close.bs.alert": "onClose",
			"closed.bs.alert": "onClosed"
		},
		initialize : function(options) {
			options || (options = {});
            _.extend(this, _.pick(options, _.keys(this.defaults)));
            _.bindAll(this, "close");
			this.__applyCallbacks(options);
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.on("close", function(view) {
				view.$el.alert('close');
				view.destroy();
			});
		},
		render: function() {
            var data = this.model ? this.model.toJSON() : {};
            var that = this;
            var bind = this.__getBind();
            this.$el.html(this.template(bind));

            this.$el.addClass('alert-' + bind.type);

            this.$alertCloseBtn = this.$el.find('#AlertCloseBtn');
            this.$alertTitle = this.$el.find('#AlertTitle');
            this.$alertMessage = this.$el.find('#AlertMessage');

            this.$el.alert();

            if (this.hideCloseButton)
                this.$alertCloseBtn.hide();
            else
                this.$alertCloseBtn.off().click(that.close);

            if (bind.alertStyle)
            	this.$el.attr('style', bind.alertStyle);

            this.postRender();

            return this;
        },
        postRender : function() {
        	return this;
        },
        close: function(e) {
            if (e) e.preventDefault();
            var that = this;
            if (!this.trigger) return;
            this.trigger("close", this);
            setTimeout(function() {
                that.$el.alert("close");
                that.remove();
            }, 25);
        },
		onDispose : function() {
			this.destroy();
		},
		/**
		 * This method can be called publicly if we would not like to
		 * see any animation fade out from the modal. Itll just directly destroy.
		 * @return {[type]} [description]
		 */
		destroy : function() {
			this.remove();
			this.stopListening();
		},
		__getBind : function() {
            var bind = {};
            if (this.title)
            	bind.title = this.title;
            else
            	bind.title = this.defaults.title;
            if (this.message)
            	bind.message = this.message;
            else
            	bind.message = this.defaults.message;
            if (this.type)
            	bind.type = this.type;
            else
            	bind.type = this.defaults.type;
            if (this.alertStyle)
            	bind.alertStyle = this.alertStyle;
            return bind;
        },
		__applyCallbacks : function(options) {
			// Callbacks
			if (typeof options.onClose == 'function')
				this.onClose = options.onClose;
			if (typeof options.onClosed == 'function')
				this.onClosed = options.onClosed;
		}
	});
});
