/*
	Backbone ModalView
	Joaquin Briceno
 */
(function() {
    Backbone.ModalView = Backbone.View.extend({
        className: "modal backbone-modal fade",
        template: _.template([
			'<div class="modal-dialog" {{ dialogStyle }}>', 
			'	<div class="modal-content">',
			'		<div class="modal-header">',
			'			<button type="button" class="close" data-dismiss="modal">',
			'				<span class="glyphicon glyphicon-remove-circle"></span>',
			'			</button>',
			' 			{{ title }}',
			'		</div>',
			'		<div class="modal-body">{{ body }}</div>',
			'		<div class="modal-footer">{{ footer }}</div>',
			'	</div>',
			'</div>'
        ].join("\n")),
        buttonTemplate: _.template('<a href="{{ href }}" class="btn {{ className }}">{{ label }}</a>'),
        buttonDefaults: {
            className: "",
            href: "#",
            label: "",
            close: false
        },
        defaults: {
        	backdrop : true,
			dialogStyle: null,
            hideCloseButton : false,
            hideFooter : false,
            triggerClose : null,
			title: "<h3>Info</h3>",
			body: '',
	        footer : '',
            buttons: [{
                className: "btn-primary",
                href: "#",
                label: "Close",
                close: true
            }],
            toAppend: {},
            postRender: function() {
                return this;
            }
        },
        initialize: function(options) {
            options || (options = {});
            _.defaults(this, this.defaults);
            _.extend(this, _.pick(options, _.keys(this.defaults)));
            _.bindAll(this, "close");
        },
        render: function() {
            var data = this.model ? this.model.toJSON() : {};
            var view = this;
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

            _.each(this.buttons, function(button) {
                _.defaults(button, view.buttonDefaults);
                var $button = $(view.buttonTemplate(button));
                view.$footer.append($button);
                if (button.close) $button.on("click", view.close);
            });

            this.$el.modal({
                keyboard: false,
                backdrop: this.backdrop
            });

            if (this.hideCloseButton)
                this.$header.find('.close').hide();
            else
                this.$header.find(".close").off().click(view.close);

            if (this.backdrop === true)
                $('.modal-backdrop').off().click(view.close);

            this.postRender();

            return this;
        },
        close: function(e) {
            if (e) e.preventDefault();
            var view = this;
            if (!this.trigger) return;
            this.trigger("close", this);
            setTimeout(function() {
                view.$el.modal("hide");
                view.remove();
            }, 25);
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
            return bind;
        }
    });

}).call(this);