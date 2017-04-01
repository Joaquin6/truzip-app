define(['jquery', 'underscore', 'backbone', 'leaflet', 'omnivore', 'sprintf', 'events', 'utility', 'collections/PropertiesCollection', 'models/MapModel', 'models/SearchModel', 'text!templates/listings/map/ListingsMapTemplate.html'], function($, _, Backbone, L, omnivore, nopSprintf, Events, Utility, Collection, Model, SearchModel, Template) {
	return Backbone.View.extend({
		el : "#ListingsMap",
		__map : null,
		__data : null,
		__model : null,
		__icons : null,
		__neighbors : null,
		__searchedBy : null,
		__osmTileLayer : null,
		__cachedMarkers : [],
		__AreaBoundaries : null,
		__layerController : null,
		__initialZoomLevel : {
			initial : null,
			byZipcode : 14,
			byCityname : 13
		},
		__GoodMarkerClusters : null,
		__FairMarkerClusters : null,
		__RestMarkerClusters : null,
		__SelectedPropertyCircleArea : null,
		initialize : function(options) {
			_.bindAll(this, 'addMarker');
			this.__setupHandlers();
		},
		onDispose : function() {
			this.remove();
			this.stopListening();
			this.__cachedMarkers = [];
		},
		render : function() {
			var that = this;
			this.$el.html(Template);
			this.__createMapObj();
			this.__model = new Model();
			this.__model.request(function(geo) {
				that.__data = geo;
				Events.trigger(Events.MapDataIsSet, geo);
				that.initMap();
			});
			this.setHeight();
		},
		initMap : function() {
			if (this.__data == null)
				return;
			if (!Collection.hasSync)
				return;
			if (Collection.models.length == 0) {
				$('.leaflet-control-loader').css('display', 'none');
			}
			var centroid = this.__getCentroid();
			if (centroid == null)
				return;
			var geo = this.__data;
			var searchedBy = this.__searchedBy = this.__model.get('searchedBy');
			var Map = this.__setMapView(centroid, searchedBy);
			this.__createNeighborBounds(geo);
			if (searchedBy == 'zipcode')
				this.__createAreaBoundaries(geo);
			this.addMarkers();
			var ZoomController = this.__createZoomControl();
			var LayerController = this.__createLayerController();
			if (searchedBy == 'cityname')
				this.__updateClustersGroupsZoomLevel();
			Map.addLayer(this.__GoodMarkerClusters);
			Map.addLayer(this.__FairMarkerClusters);
			Map.addLayer(this.__RestMarkerClusters);
			Map.addControl(ZoomController);
			if (LayerController)
				Map.addControl(LayerController);
			this.__CustomizeMapClasses();
			this.__MapHandlers(searchedBy);
		},
		setHeight : function() {
			var height;
			var navheader = $('#Header').outerHeight(true);
			var container = $("#ListingsContainer").outerHeight(true);
			var mapheader = $(".ListingsMapHeader").outerHeight(true);
			var footer = $("#Footer").outerHeight(true);
			var sidebarWidth = $('.ListingsSideBarContainer').outerWidth(true);
			if (document.body.clientWidth <= 480) {
				height = document.body.clientHeight - (navheader + footer);
			} else {
				if (mapheader == 0) {
					height = container - footer;
				} else {
					height = container - mapheader;
				}
			}
			$(this.el).css('height', height + 'px');
			if (navigator.userAgent.indexOf('Firefox') > -1) {
				$(this.el).css('padding-top', mapheader + 'px');
				var ffHeight = mapheader + height;
				$(this.el).css('height', ffHeight + 'px');
			}
		},
		resetMapSize : function(openedDetails, detailsWidth, mapWidth, latlng) {
			var Map = this.__map;
			var circleArea = this.__SelectedPropertyCircleArea;
			var coords = null;
			var controller = $('.leaflet-control');
			var controllerStatus = controller.css('display');
			if (openedDetails && latlng) {
				if (isNaN(latlng[0]) || isNaN(latlng[1]))
					return;
				// If Details is being opened
				coords = latlng;
				if (Map.hasLayer(circleArea)) {
					Map.panTo(coords, {
						animate : true,
						duration : 0.50,
						easeLinearity : 0.05
					});
					circleArea.setLatLng(coords);
					return;
				}
				var adjustedWidth = $('#ListingsMapContainer')[0].offsetWidth - $('.ui-effects-wrapper')[0].clientWidth;
				if (adjustedWidth <= 89 && $('#ListingsMapContainer').is(':visible')) {
					$('#ListingsMapContainer').css('display', 'none');
					return;
				}
				if (adjustedWidth <= 89 && !$('#ListingsMapContainer').is(':visible')) {
					return;
				}
				$('#ListingsMapContainer').css('width', adjustedWidth + 'px');
				Map.setView(coords, 16);
				circleArea.setLatLng(coords);
				circleArea.addTo(Map);
				if (controllerStatus !== "none") {
					controller.css('display', 'none');
				}
			} else if (openedDetails && !latlng) {
				// If Window Resize & Details is already opened
				var SidebarWidth = $('#ListingsSidebarContainer').outerWidth(true);
				var adjustedWidth = mapWidth - (detailsWidth + SidebarWidth);
				if (adjustedWidth <= 89 && $('#ListingsMapContainer').is(':visible')) {
					$('#ListingsMapContainer').css('display', 'none');
					return;
				}
				if (adjustedWidth <= 89 && !$('#ListingsMapContainer').is(':visible')) {
					return;
				}
				if (adjustedWidth > 89 && !$('#ListingsMapContainer').is(':visible')) {
					$('#ListingsMapContainer').css('display', 'block');
				}
				$('#ListingsMapContainer').css('width', adjustedWidth + 'px');
				if (controllerStatus !== "none") {
					controller.css('display', 'none');
				}
			} else {
				// If Details is being closed
				var ContainerWidth = $('#ListingsContainer').outerWidth(true);
				var SidebarWidth = $('#ListingsSidebarContainer').outerWidth(true);
				var adjustedWidth = ContainerWidth - SidebarWidth;
				var initialZoomLevel = this.__initialZoomLevel.initial;
				if (adjustedWidth > 89 && !$('#ListingsMapContainer').is(':visible')) {
					$('#ListingsMapContainer').css('display', 'block');
				}
				$('#ListingsMapContainer').css('width', adjustedWidth + 'px');
				if (this.__map.hasLayer(circleArea)) {
					this.__map.removeLayer(circleArea);
				}
				coords = Map.options.center;
				if (!coords) {
					coords = [Map.getCenter().lat, Map.getCenter().lng];
				}
				Map.setView(coords, initialZoomLevel);
				if (controllerStatus !== "block") {
					controller.css('display', 'block');
				}
			}
			Map.invalidateSize();
			this.setHeight();
		},
		addMarkers : function() {
			if (this.__cachedMarkers.length == 0) {
				// grab - properties directly from collection
				for (var i = 0; i < Collection.models.length; i++)
					this.__cachedMarkers.push(Collection.models[i]);
			} else if ((this.__cachedMarkers[0].attributes.Address.indexOf(this.__data[0].City) < 0) || (this.__cachedMarkers.length != Collection.models.length)) {
				this.__cachedMarkers = [];
				for (var i = 0; i < Collection.models.length; i++)
					this.__cachedMarkers.push(Collection.models[i]);
			}
			for (var i = 0; i < this.__cachedMarkers.length; i++) {
				this.addMarker(this.__cachedMarkers[i]);
			}
			// assume map will load after 1 secs...fire off this event to others
			setTimeout(function() {
				Events.trigger(Events.mapLoaded);
			}, 1000);
		},
		addMarker : function(property) {
			if (this.__map == null) {
				this.__cachedMarkers.push(property);
				return;
			}
			if (Utility.isExcluded(property))
				return;
			var latitude = property.get('Latitude');
			var longitude = property.get('Longitude');
			if (!Utility.isGeoValid(latitude, longitude)) {
				return;
			}
			if ( typeof latitude == 'string') {
				latitude = parseFloat(latitude);
			}
			if ( typeof longitude == 'string') {
				longitude = parseFloat(longitude);
			}

			var uniqueid = property.get('_id');
			var address = property.get('Address');
			var dealtype = property.get('DealType');
			var yousave = '$' + Utility.nFormatter(property.get('YouSave'));
			var icons = this.__icons;
			var popupContent = this.__model.getPopupContent(property, dealtype, yousave);

			if (dealtype == 2) {
				var goodmarker = L.marker([latitude, longitude], {
					icon : icons.goodIcon,
					title : address,
					alt : uniqueid,
					yousave : yousave,
					labelText : 'Save: ' + yousave,
					LatLng : [latitude, longitude],
					zIndexOffset : 200,
					riseOnHover : true
				}).bindLabel('Save: ' + yousave, {
					noHide : true,
					offset : [18, -30]
				}).bindPopup(popupContent, {
					closeButton : false,
					maxWidth : 180,
					minWidth : 170,
					maxHeight : 200
				}).addTo(this.__GoodMarkerClusters);
				goodmarker.on('add', function(e) {
					var marker = e.target;
					if (marker.label == null) {
						var labelText = marker.options.labelText;
						marker.bindLabel(labelText, {
							noHide : true
						});
						marker.showLabel();
					}
				}).on('mouseover', function(a) {
					a.target.setIcon(icons.hoverIcon);
					a.target.setLabelNoHide(false);
					a.target.openPopup();
				}).on('mouseout', function(v) {
					v.target.setLabelNoHide(true);
					v.target.setIcon(icons.goodIcon);
					v.target.closePopup();
				}).addTo(this.__GoodDealMarkers);
			} else if (dealtype == 3) {
				var fairmarker = L.marker([latitude, longitude], {
					icon : icons.fairIcon,
					title : address,
					alt : uniqueid,
					yousave : yousave,
					labelText : 'Save: ' + yousave,
					LatLng : [latitude, longitude],
					zIndexOffset : 200,
					riseOnHover : true
				}).bindLabel('Save: ' + yousave, {
					noHide : true,
					offset : [18, -30]
				}).bindPopup(popupContent, {
					closeButton : false,
					maxWidth : 180,
					minWidth : 170,
					maxHeight : 200
				}).addTo(this.__FairMarkerClusters);
				fairmarker.on('add', function(e) {
					var marker = e.target;
					if (marker.label == null) {
						var labelText = marker.options.labelText;
						marker.bindLabel(labelText, {
							noHide : true
						});
						marker.showLabel();
					}
				}).on('mouseover', function(a) {
					a.target.setIcon(icons.hoverIcon);
					a.target.setLabelNoHide(false);
					a.target.openPopup();
				}).on('mouseout', function(v) {
					v.target.setIcon(icons.fairIcon);
					v.target.setLabelNoHide(true);
					v.target.closePopup();
				}).addTo(this.__FairDealMarkers);
			} else {
				var restmarker = L.marker([latitude, longitude], {
					icon : icons.restIcon,
					title : address,
					alt : uniqueid,
					yousave : yousave,
					LatLng : [latitude, longitude],
					zIndexOffset : 0,
					riseOnHover : true
				}).bindPopup(popupContent, {
					closeButton : false,
					maxWidth : 180,
					minWidth : 170,
					maxHeight : 200
				}).addTo(this.__RestMarkerClusters);
				restmarker.on('mouseover', function(a) {
					a.target.setIcon(icons.hoverIcon);
					a.target.openPopup();
				}).on('mouseout', function(v) {
					v.target.setIcon(icons.restIcon);
					v.target.closePopup();
				}).addTo(this.__RestDealMarkers);
			}
		},
		handleMarkerPopup : function(markerObj) {
			if ((!this.__map) || (!this.__map._loaded)) {
				return;
			}
			if (!markerObj) {
				this.__map.closePopup();
				return;
			}
			var layersgroup;
			if (markerObj.dealtype == 2) {
				layersgroup = this.__GoodDealMarkers.getLayers();
			} else if (markerObj.dealtype == 3) {
				layersgroup = this.__FairDealMarkers.getLayers();
			} else {
				layersgroup = this.__RestDealMarkers.getLayers();
			}
			for ( i = 0; i < layersgroup.length; i++) {
				var layer = layersgroup[i];
				if (layer.options.alt == markerObj.uniqueId) {
					layer.openPopup();
					break;
				}
			}
		},
		notify : function(context) {
			if (context.action !== 'PropertyLoading')
				return;
			var layerOptions = context.layerOptions;
			var iconOptions = layerOptions.icon.options;

			var options = {};
			options.icon = 'fa fa-spinner fa-pulse';
			options.message = '<strong>Property Still Loading</strong>';

			var settings = {};
			settings.element = this.$el;
			settings.placement = {};
			settings.placement.from = "bottom";
			settings.placement.align = "left";
			settings.icon_type = "class";

			$.notify(options, settings);
		},
		__createMapObj : function() {
			this.__createGlobalMapLayers();
			//this.__osmTileLayer = new L.TileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			this.__osmTileLayer = L.tileLayer.provider('Esri.WorldTopoMap', {
				errorTileUrl : '../images/mapicons/TZ-Map-Tiles.png'
			}).on('loading', function(e) {
				if ($('.leaflet-control-loader').css('display') != "block") {
					$('.leaflet-control-loader').css('display', 'block');
				}
			}).on('load', function(e) {
				if ($('.leaflet-control-loader').css('display') != "none") {
					$('.leaflet-control-loader').css('display', 'none');
				}
			});
			this.__map = L.map('Map', {
				attributionControl : false,
				zoomControl : false,
				layers : [this.__osmTileLayer, this.__AreaBoundaries]
			});
		},
		__createGlobalMapLayers : function() {
			this.__GoodDealMarkers = new L.LayerGroup();
			this.__FairDealMarkers = new L.LayerGroup();
			this.__RestDealMarkers = new L.LayerGroup();
			this.__AreaBoundaries = new L.LayerGroup();
			this.__checkInitIconAndClusterGlobals();
		},
		__setMapView : function(centroid, searchedBy) {
			// ZOOM : The higher the value, the closer to the map view will be.
			// The lower the value, the furthest you are from target.
			if (!this.__icons)
				this.__initMapIcons();
			var coords = [parseFloat(centroid.Lat), parseFloat(centroid.Lng)];
			// If searchedBy == 'zipcode', then we set the zoom level closer to the ground
			// Else we set the zoom level further from the ground.
			// We do this to cover more icons on the map as possible.
			if (searchedBy == 'zipcode')
				var zoomLevel = this.__initialZoomLevel.initial = this.__initialZoomLevel.byZipcode;
			else
				var zoomLevel = this.__initialZoomLevel.initial = this.__initialZoomLevel.byCityname;
			this.__map.setView(coords, zoomLevel, {
				maxZoom : 18,
				minZoom : 6
			});
			this.__SelectedPropertyCircleArea = L.circle(coords, 200, {
				weight : 2,
				fill : true
			});
			this.__map.options.center = coords;
			return this.__map;
		},
		__getValidLatLng : function(geo) {
			for ( i = 0; i < geo.length; i++) {
				var latlng = geo[i].LatLng;
				if ((!isNaN(parseInt(latlng.Lat))) && (!isNaN(parseInt(latlng.Lng)))) {
					return latlng;
				}
			}
		},
		__getValidSegment : function(geo) {
			for ( i = 0; i < geo.length; i++) {
				var latlng = geo[i].LatLng;
				if ((!isNaN(parseInt(latlng.Lat))) && (!isNaN(parseInt(latlng.Lng)))) {
					return i;
				}
			}
		},
		__getMapBoundaries : function(geo) {
			if (!geo) {
				geo = this.__data;
			}
			var NElatlng = geo[0].LatLngNorthEast;
			var SWlatlng = geo[0].LatLngSouthWest;
			var northeast = L.latLng(parseFloat(NElatlng.Lat), parseFloat(NElatlng.Lng));
			var southwest = L.latLng(parseFloat(SWlatlng.Lat), parseFloat(SWlatlng.Lng));
			return L.latLngBounds(southwest, northeast);
		},
		__MapHandlers : function(searchedBy) {
			var Map = this.__map;
			var NeighborBoundaries = this.__neighbors;
			if (!searchedBy)
				searchedBy = this.__searchedBy;
			Map.on('zoomend', function(e) {
				// User searched by cityname, instead of a zipcode,
				// we do not display the neighbor boundaries.
				if (searchedBy == 'cityname')
					return;
				var ZoomLevel = e.target.getZoom();
				if (ZoomLevel <= 12) {
					NeighborBoundaries.addTo(Map);
				} else {
					if (Map.hasLayer(NeighborBoundaries)) {
						Map.removeLayer(NeighborBoundaries);
					}
				}
			}).on("overlayadd", function(e) {
				var addedLayers = e.layer.getLayers();
				var layertype = e.layer.options.name;
				Events.trigger(Events.syncSidebar, addedLayers, null, layertype);
			}).on("overlayremove", function(e) {
				var removedLayers = e.layer.getLayers();
				var layertype = e.layer.options.name;
				Events.trigger(Events.syncSidebar, null, removedLayers, layertype);
			});
		},
		__checkInitIconAndClusterGlobals : function() {
			if (this.__icons && this.__GoodMarkerClusters && this.__FairMarkerClusters && this.__RestMarkerClusters) {
				return;
			}
			if (!this.__icons) {
				this.__initMapIcons();
			}
			if (!this.__GoodMarkerClusters) {
				this.__initGoodClustersGroup();
			}
			if (!this.__FairMarkerClusters) {
				this.__initFairClustersGroup();
			}
			if (!this.__RestMarkerClusters) {
				this.__initRestClustersGroup();
			}
		},
		__initMapIcons : function() {
			this.__icons = {
				goodIcon : L.icon({
					iconUrl : "../images/mapicons/good-deal.png",
					iconSize : [27, 41],
					iconAnchor : [13, 40],
					popupAnchor : [1, -38]
				}),
				fairIcon : L.icon({
					iconUrl : "../images/mapicons/fair-deal.png",
					iconSize : [27, 41],
					iconAnchor : [13, 40],
					popupAnchor : [1, -38]
				}),
				restIcon : L.icon({
					iconUrl : "../images/mapicons/rest-deal.png",
					iconSize : [27, 41],
					iconAnchor : [13, 40],
					popupAnchor : [1, -38]
				}),
				hoverIcon : L.icon({
					iconUrl : "../images/mapicons/hover-over.png",
					iconSize : [27, 41],
					iconAnchor : [13, 40],
					popupAnchor : [1, -38]
				})
			};
		},
		__createNeighborBounds : function(geo) {
			this.__neighbors = new L.LayerGroup();
			var LayerGroup = this.__neighbors,
			    x = 0,
			    parLat = parseFloat(geo[0].LatLng.Lat),
			    parLng = parseFloat(geo[0].LatLng.Lng);
			if ((isNaN(parLat)) || (isNaN(parLng))) {
				x = this.__getValidSegment(geo);
			}
			var neighborZips = geo[x].NeighbourZips;
			for ( i = 0; i < neighborZips.length; i++) {
				var that = this;
				var distance = neighborZips[i].Distance;
				if (distance > 6) {
					break;
				} else {
					var GeoUrl = location.origin + '/geos/' + neighborZips[i].Zip;
					$.getJSON(GeoUrl, function(data, status) {
						if (status == "success") {
							if (data[0].KML == null)
								return;
							if (data[0].KML.length > 0) {
								var kmlObj = {};
								kmlObj.KMLCoordinates = Utility.getKMLCoordinatesValues(data[0].KML);
								kmlObj.CityName = data[0].City;
								kmlObj.Zip = data[0].Zip;
								kmlObj.State = data[0].State;
								kmlObj.LatLng = data[0].LatLng;
								var neighborGeoXML = Utility.generateXML(kmlObj);
								var omniGeoKML = omnivore.kml.parse(neighborGeoXML);
								var LabelContent = kmlObj.CityName + ', ' + kmlObj.State + '<br>' + kmlObj.Zip;
								omniGeoKML.getLayers()[0].setStyle({
									color : '#000',
									opacity : 1,
									weight : 3,
									fillOpacity : 0
								}).bindLabel(LabelContent, {
									noHide : false,
									direction : 'auto',
									className : 'custom-leaflet-label'
								}).on('mouseover', function(e) {
									e.target.setStyle({
										fillOpacity : 0.2
									});
								}).on('mouseout', function(e) {
									e.target.setStyle({
										fillOpacity : 0
									});
								}).on('click', function(e) {
									var geo = e.target.feature.properties.description;
									SearchModel.search(geo);
								}).addTo(LayerGroup);
							}
						}
					});
				}
			}
		},
		__createAreaBoundaries : function(geo) {
			if (geo[0].KML == null)
				return;
			var kmlObj = {};
			kmlObj.Zip = geo[0].Zip;
			kmlObj.CityName = geo[0].City;
			kmlObj.State = geo[0].State;
			kmlObj.KMLCoordinates = Utility.getKMLCoordinatesValues(geo[0].KML);
			var kmlString = Utility.generateXML(kmlObj);
			omnivore.kml.parse(kmlString).addTo(this.__AreaBoundaries);
			var AreaBoundaryLayers = this.__AreaBoundaries.getLayers()[0].getLayers()[0];
			AreaBoundaryLayers.setStyle({
				color : '#000',
				opacity : 1,
				weight : 3,
				fillOpacity : 0
			});
		},
		__initGoodClustersGroup : function() {
			this.__GoodMarkerClusters = L.markerClusterGroup({
				name : 'GoodDeals',
				maxClusterRadius : 120,
				disableClusteringAtZoom : 14,
				spiderfyOnMaxZoom : false,
				showCoverageOnHover : false,
				removeOutsideVisibleBounds : false,
				zoomToBoundsOnClick : false,
				iconCreateFunction : function(cluster) {
					var childCount = cluster.getChildCount();
					var c = ' marker-cluster-good';
					return L.divIcon({
						html : '<div><span><b>' + childCount + '</b></span></div>',
						className : 'marker-cluster' + c,
						iconSize : [40, 40]
					});
				}
			}).on('clusterclick', function(e) {
				e.layer.zoomToBounds();
			}).on('click', function(e) {
				var context = {};
				context.alt = e.originalEvent.target.alt;
				context.layerOptions = e.layer.options;
				Events.trigger(Events.nanoScrollTo, context);
			});
		},
		__initFairClustersGroup : function() {
			this.__FairMarkerClusters = L.markerClusterGroup({
				name : 'FairDeals',
				maxClusterRadius : 120,
				disableClusteringAtZoom : 14,
				spiderfyOnMaxZoom : false,
				showCoverageOnHover : false,
				removeOutsideVisibleBounds : false,
				zoomToBoundsOnClick : false,
				iconCreateFunction : function(cluster) {
					var childCount = cluster.getChildCount();
					var c = ' marker-cluster-fair';
					return L.divIcon({
						html : '<div><span><b>' + childCount + '</b></span></div>',
						className : 'marker-cluster' + c,
						iconSize : [40, 40]
					});
				}
			}).on('clusterclick', function(e) {
				e.layer.zoomToBounds();
			}).on('click', function(e) {
				var context = {};
				context.alt = e.originalEvent.target.alt;
				context.layerOptions = e.layer.options;
				Events.trigger(Events.nanoScrollTo, context);
			});
		},
		__initRestClustersGroup : function() {
			this.__RestMarkerClusters = L.markerClusterGroup({
				name : 'RestDeals',
				maxClusterRadius : 120,
				disableClusteringAtZoom : 14,
				spiderfyOnMaxZoom : false,
				showCoverageOnHover : false,
				removeOutsideVisibleBounds : false,
				zoomToBoundsOnClick : false,
				iconCreateFunction : function(cluster) {
					var childCount = cluster.getChildCount();
					var c = ' marker-cluster-rest';
					return L.divIcon({
						html : '<div><span><b>' + childCount + '</b></span></div>',
						className : 'marker-cluster' + c,
						iconSize : [40, 40]
					});
				}
			}).on('clusterclick', function(e) {
				e.layer.zoomToBounds();
			}).on('click', function(e) {
				var context = {};
				context.alt = e.originalEvent.target.alt;
				context.layerOptions = e.layer.options;
				Events.trigger(Events.nanoScrollTo, context);
			});
		},
		__createZoomControl : function() {
			var zoomControl = L.control.zoom({
				position : "bottomright"
			});
			return zoomControl;
		},
		__createLayerController : function() {
			var isCollapsed, good, fair, rest, deals = Collection.getDealsCount();
			var subGroup = {}, baseLayers = {}, groupedOverlays = {};
			good = sprintf("<img src='../images/mapicons/GoodDealTrimmedLegend.png'> Good Deals (%s)", deals.good);
			fair = sprintf("<img src='../images/mapicons/FairDealTrimmedLegend.png'> Fair Deals (%s)", deals.fair);
			rest = sprintf("<img src='../images/mapicons/RestDealTrimmedLegend.png'> Above Market (%s)", deals.rest);
			subGroup[good] = this.__GoodMarkerClusters;
			subGroup[fair] = this.__FairMarkerClusters;
			subGroup[rest] = this.__RestMarkerClusters;

			groupedOverlays["Good Deals Sell Up to 30% Faster"] = subGroup;
			if (document.body.clientWidth <= 1024) {
				isCollapsed = true;
			} else {
				isCollapsed = false;
			}
			this.__layerController = L.control.groupedLayers(baseLayers, groupedOverlays, {
				collapsed : false,
				position : 'topleft'
			});
			return this.__layerController;
		},
		__CustomizeMapClasses : function() {
			var FormLegend = $('form.leaflet-control-layers-list');
			var LegendText = FormLegend.find('span.leaflet-control-layers-group-name');
			var seperator = $('.leaflet-control-layers-separator');
			if (seperator.attr('style') == "display: none;") {
				seperator.css('display', 'block');
			}
			var detachedSep = seperator.detach();
			FormLegend.append(detachedSep);
			FormLegend.append(LegendText.css('color', 'rgb(51,178,51)'));
		},
		__setupHandlers : function() {
			this.listenTo(Events, Events.resize, this.setHeight);
			this.listenTo(Events, Events.resizeMap, this.resetMapSize);
			this.listenTo(Events, Events.handleMapPopup, this.handleMarkerPopup);
			this.listenTo(Events, Events.dispose, this.onDispose);
			this.listenTo(Events, Events.notify, this.notify);
			this.listenTo(Collection, 'sync', function() {
				var that = this;
				that.initMap();
				setTimeout(function() {
					if ($('.leaflet-control-loader').css('display') != "none")
						that.__osmTileLayer.redraw();
				}, 2000);
			});
		},
		__getCentroid : function() {
			// if we have property data - use it to get centroid - else use zipcode data
			var coords = [];
			if (Collection.models.length > 0) {
				for (var i = 0; i < Collection.models.length; i++) {
					var model = Collection.models[i];
					var LatLng = {};
					LatLng.Lat = model.get('Latitude');
					LatLng.Lng = model.get('Longitude');
					if (LatLng.Lat && LatLng.Lng)
						coords.push(LatLng);
				}
			} else {
				for (var i = 0; i < this.__data.length; i++) {
					var LatLng = this.__data[i].LatLng;
					if (LatLng.Lat && LatLng.Lng)
						coords.push(LatLng);
				}
			}
			if (coords.length == 0)
				return null;
			return Utility.getCentroidOfLatLng(coords);
		},
		__updateClustersGroupsZoomLevel : function() {
			var newZoomLevel = this.__initialZoomLevel.byCityname;
			this.__GoodMarkerClusters.options.disableClusteringAtZoom = newZoomLevel;
			this.__FairMarkerClusters.options.disableClusteringAtZoom = newZoomLevel;
			this.__RestMarkerClusters.options.disableClusteringAtZoom = newZoomLevel;
		}
	});
});
