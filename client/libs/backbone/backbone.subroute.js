// Allow us to create subroutes for mobile devices
(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['underscore', 'backbone'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('underscore'), require('backbone'));
    } else {

        factory(_, Backbone);
    }
}(function(_, Backbone) {
    Backbone.SubRoute = Backbone.Router.extend({
        constructor: function(prefix, options) {
            this.routes = _.clone(this.routes) || {};
            this.prefix = prefix = prefix || "";
            this.separator = (prefix.slice(-1) === "/") ? "" : "/";
            this.createTrailingSlashRoutes = options && options.createTrailingSlashRoutes;
            Backbone.Router.prototype.constructor.call(this, options);
            var hash;
            if (Backbone.history.fragment) {
                hash = Backbone.history.getFragment(Backbone.history.fragment);
            } else {
                hash = Backbone.history.getHash();
            }
            _.every(this.routes, function(key, route) {
                if (hash.match(Backbone.Router.prototype._routeToRegExp(route))) {
                    Backbone.history.loadUrl(hash);
                    return false;
                }
                return true;
            }, this);
            if (this.postInitialize) {
                this.postInitialize(options);
            }
        },
        navigate: function(route, options) {
            if (route.substr(0, 1) != '/' &&
                route.indexOf(this.prefix.substr(0, this.prefix.length - 1)) !== 0) {
                route = this.prefix +
                    (route ? this.separator : "") +
                    route;
            }
            Backbone.Router.prototype.navigate.call(this, route, options);
        },
        route: function(route, name, callback) {
            if (route.substr(0) === "/") {
                route = route.substr(1, route.length);
            }
            var _route = this.prefix;
            if (route && route.length > 0) {
                if (this.prefix.length > 0)
                    _route += this.separator;
                _route += route;
            }
            if (this.createTrailingSlashRoutes) {
                this.routes[_route + '/'] = name;
                Backbone.Router.prototype.route.call(this, _route + '/', name, callback);
            }
            delete this.routes[route];
            this.routes[_route] = name;
            return Backbone.Router.prototype.route.call(this, _route, name, callback);
        }
    });
    return Backbone.SubRoute;
}));
