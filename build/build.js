({
	baseUrl : '../client/js',
	name : 'app',
	out : '../release/js/app.js',
	findNestedDependencies : true,
	mainConfigFile : '../client/js/app.js',
	optimize : 'none', // set to 'none' to make debugging easier or 'uglify' for compact
	paths : {
		modernizr : 'empty:',
		// 3rd party libs - AMD Enabled
		jquery : 'empty:',
		backbone : 'empty:',
		underscore : 'empty:',
		jqueryui : 'empty:',
		jqueryform: 'empty:',
		jcarousel: 'empty:',
		slick : 'empty:',
		leaflet : 'empty:',
		ismobile : 'empty:',
		omnivore : 'empty:',
		scrollto : 'empty:',
		locatecontrol : 'empty:',
		sprintf : 'empty:',
		spinner : 'empty:',
		notify : 'empty:',
		stripe : 'empty:',
		// Shim required
		jqueryeasing : 'empty:',
		bootstrap : 'empty:',
		typeahead : 'empty:',
		smartresize : 'empty:',
		xmlwriter : 'empty:',
		select2 : 'empty:',
		leafletplugins : 'empty:',
		groupedlayercontrol : 'empty:',
		// App defines
		custom : './custom',
		utility : 'views/helpers/utility',
		templates : '../templates',
		text : '../../../website/client/libs/require/text'
	}
})