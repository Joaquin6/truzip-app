define(['jquery'], function($) {
	return {
		initialize : function() {
			this.__extendJQ();
			this.__patchJQ();
			this.__newsTicker();
		},
		__extendJQ : function() {
			$.fn.extend({
				disable : function(state) {
					return this.each(function() {
						var $this = $(this);
						$this.toggleClass('disabled', state);
					});
				}
			});
		},
		__patchJQ : function() {
			$.createCache = function(requestFunction) {
				var cache = {};
				return function(key, callback) {
					if (!cache[key]) {
						cache[key] = $.Deferred(function(defer) {
							requestFunction(defer, key);
						}).promise();
					}
					return cache[key].done(callback);
				};
			};
			$.cachedGetScript = $.createCache(function(defer, url) {
				$.getScript(url).then(defer.resolve, defer.reject);
			});
			$.loadImage = $.createCache(function(defer, url) {
				var image = new Image();
				function cleanUp() {
					image.onload = image.onerror = null;
				}


				defer.then(cleanUp, cleanUp);
				image.onload = function() {
					defer.resolve(url);
				};
				image.onerror = defer.reject(url);
				image.src = url;
			});
		},
		__newsTicker : function() {
			$.fn.newsticker = function(opts) {
				// default configuration
				var config = $.extend({}, {
					height : 30,
					speed : 800,
					interval : 3000,
					move : null
				}, opts);
				// main function
				function init(obj) {
					var $newsticker = obj, $frame = $newsticker.find('.newsticker-list'), $item = $frame.find('.newsticker-item'), $next, startPos = 0, stop = false;

					function init() {
						var customizedHeight = parseInt($item.eq(0).css('height').split('px')[0]), lineHeight = parseInt($newsticker.css('lineHeight').split('px')[0]);
						$newsticker.css('height', config.height);
						//set customized height
						startPos = (config.height - lineHeight) / 2;
						//re-write start position;
						$frame.css('top', startPos);
						$item.eq(0).addClass('current');
						//set start item
						suspend();
						move();
					};

					function suspend() {
						$newsticker.on('mouseover mouseout', function(e) {
							if (e.type == 'mouseover') {
								stop = true;
							} else {//mouseout
								stop = false;
							}
						});
					};

					function move() {
						if ($.isFunction(config.move)) {
							config.move.call(this);
						} else {
							setInterval(function() {
								if (!stop) {
									var $current = $frame.find('.current');

									$frame.animate({
										top : '-=' + config.height + 'px'
									}, config.speed, function() {
										$next = $frame.find('.current').next();
										$next.addClass('current');
										$current.removeClass('current');
										$current.clone().appendTo($frame);
										$current.remove();
										$frame.css('top', startPos + 'px');
									});
								}
							}, config.interval);
						}
					};

					init();
				}

				// initialize every element
				this.each(function() {
					init($(this));
				});
				return this;
			};
		}
	};
});
