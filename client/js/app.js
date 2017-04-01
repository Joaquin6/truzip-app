require.config({
	baseUrl : '/js',
	paths : {
		modernizr : '../libs/modernizr/modernizr.min',
		// AMD Enabled
		jquery : '../libs/jquery/jquery-1.11.2.min',
		backbone : '../libs/backbone/backbone-min',
		underscore : '../libs/underscore/underscore-min',
		jqueryui : '../libs/jquery/jquery-ui/jquery-ui',
		jqueryform: '../libs/jquery/jquery-form/jquery.form',
		jcarousel: '../libs/jquerycarousel/jquerycarousel.min',
		slick : '../libs/slick/v1.5.9/slick/slick.min',
		leaflet : '../libs/leaflet/leaflet',
		ismobile : '../libs/isMobile/isMobile.min',
		omnivore : '../libs/leaflet/leaflet-omnivore/leaflet-omnivore',
		scrollto : '../libs/jquery/jquery.scrollTo/jquery.scrollTo.min',
		locatecontrol : '../libs/leaflet/leaflet-locatecontrol/dist/L.Control.Locate.min',
		sprintf : '../libs/sprintf/sprintf.min',
		spinner : '../libs/spin/spin.min',
		notify : '../libs/bootstrap/notify/bootstrap-notify.min',
		stripe : 'https://checkout.stripe.com/checkout',
		// Shim required
		jqueryeasing : '../libs/jquery/jquery.easing.min',
		bootstrap : '../libs/bootstrap/v3.3.6/dist/js/bootstrap.min',
		typeahead : '../libs/typeahead/dist/typeahead.bundle.min',
		smartresize : '../libs/jquery/jquery-smartresize/jquery.debouncedresize',
		xmlwriter : '../libs/xmlwriter/XMLWriter-1.0.0',
		select2 : '../libs/select2/js/select2.min',
		leafletplugins : '../libs/leaflet/custom/leaflet-plugins',
		groupedlayercontrol : '../libs/leaflet/leaflet-groupedlayercontrol/dist/leaflet.groupedlayercontrol.min',
		// App defines
		custom : './custom',
		utility : 'views/helpers/utility',
		templates : '../templates',
		text : '../libs/require/text'
	},
	shim : {
		"jqueryeasing" : {
			deps : ["jquery"]
		},
		"jcarousel": {
		    deps: ["jquery"]
		},
		"bootstrap" : {
			deps : ["jquery"]
		},
		"typeahead" : {
			deps : ["jquery"]
		},
		"select2" : {
			deps : ["jquery"]
		},
		"smartresize" : {
			deps : ["jquery"]
		},
		"leafletplugins" : {
			deps : ["leaflet"]
		},
		"groupedlayercontrol" : {
			deps : ["leaflet"]
		}
	},
	waitSeconds : 200 //,
	//enforceDefine: true
	//  urlArgs: "bust=" + (new Date()).getTime()  /// REMOVE LATER!!! force update
});

require(['modernizr', 'jquery', 'underscore', 'backbone', 'jqueryui', 'bootstrap', 'notify', 'ismobile', 'smartresize', 'slick', 'scrollto', 'xmlwriter', 'leafletplugins', 'locatecontrol', 'groupedlayercontrol', 'custom'], function(Modernizr, $, _, Backbone, jQueryUI, Bootstrap, Notify, Mobile, SmartResize, Slick, scrollTo, XMLWriter, LPlugins, LocateControl, GroupedLayerControl, Custom) {
	// so we can bind with {{ replaceme }} for underscore templates
	_.templateSettings = {
		evaluate : /\{\[([\s\S]+?)\]\}/g,
		interpolate : /\{\{([\s\S]+?)\}\}/g
	};
	Custom.initialize();
	require(['router', 'utility'], function(Router, Utility) {
		Utility.initialize();
	});
});
