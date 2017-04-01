define(['jquery', 'underscore', 'backbone'], function($, _, Backbone) {
	return _.extend({
		dispose : 'dispose',
		resize : 'resize',
		notify : 'notify',
		resizeDetails : 'resizeDetails',
		property : 'property',
		showDetails : 'showDetails',
		resizeMap : 'resizeMap',
		nanoScrollTo : 'nanoScrollTo',
		geoDataIsSet : 'geoDataIsSet',
		tabMap : 'tabMap',
		handleMapPopup : 'handleMapPopup',
		syncSidebar : 'syncSidebar',
		MapDataIsSet : 'MapDataIsSet',
		mapLoaded : 'mapLoaded',
		bestDealsCarousel : 'bestDealsCarousel',
		onAppendBestDeals : 'onAppendBestDeals'
	}, Backbone.Events);
});
