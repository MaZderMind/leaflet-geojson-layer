// add tiled vector feature support
L.Path.include({
	_initPath: L.Path.SVG ? function() {

		// tiled vector feature support
		if(this._tilePoint) {
			var map = this._map,
				tilePoint = this._tilePoint,
				tileId = map._zoom+'/'+tilePoint.x+'/'+tilePoint.y,
				cpId = 'cp-'+map._zoom+'-'+tilePoint.x+'-'+tilePoint.y,
				tileContainer = this._tileContainers[tileId];

			if(!tileContainer) {
				tileContainer = this._createElement('g');
				this._tileContainers[tileId] = tileContainer;

				//tileContainer.setAttribute('data-tile-x', tilePoint.x);
				//tileContainer.setAttribute('data-tile-y', tilePoint.y);
				//tileContainer.setAttribute('data-tile-zoom', map._zoom);
				tileContainer.setAttribute('clip-path', 'url(#'+cpId+')');
			}

			this._container = tileContainer;
		}
		else {
			this._container = this._createElement('g');
		}

		this._path = this._createElement('path');
		this._container.appendChild(this._path);

	} : function() {

		var container = this._container = this._createElement('shape');
		L.DomUtil.addClass(container, 'leaflet-vml-shape');
		if (this.options.clickable) {
			L.DomUtil.addClass(container, 'leaflet-clickable');
		}
		container.coordsize = '1 1';
		this._path = this._createElement('path');
		container.appendChild(this._path);

		console.log(container);
		this._map._pathRoot.appendChild(container);

	},
});

L.GeoJsonTileLayer = L.TileLayer.extend({
	includes: {
		_tileContainers: {},
		_svgClipRects: {}
	},

	options: {
		unloadInvisibleTiles: true,
		smoothFactor: 0.0,
		noClip: true,

		cache: true,
		dataType: 'json'
	},

	statics: {
		_createElement: function (name) {
			if(L.Path.SVG) {
				return document.createElementNS(L.Path.SVG_NS, name);
			}
			else {
				// TODO: VML
			}
		}
	},

	initialize: function (url, options) {
		L.TileLayer.prototype.initialize.call(this, url, options);

		this.on('tileunload', function(info) {
			var
				tileId = info.tile._tileId,
				tileContainer = this._tileContainers[tileId];

			// TODO: fade out
			try {
				if(tileContainer && tileContainer.parentNode && tileContainer.parentNode.removeChild)
					tileContainer.parentNode.removeChild(tileContainer);
			}
			catch(e) {
				// nop
			}
		});
	},

	onAdd: function(map) {
		map._initPathRoot();
		L.TileLayer.prototype.onAdd.call(this, map);
	},

	_createTileProto: function () {
		var el = this._tileEl = L.DomUtil.create('div', 'leaflet-tile');

		var tileSize = this.options.tileSize;
		el.style.width = tileSize + 'px';
		el.style.height = tileSize + 'px';
		//el.style.backgroundColor = 'green';
		//el.style.border = '1px solid red';
	},

	_createTile: function () {
		var tile = this._tileEl.cloneNode(false);
		tile.onselectstart = tile.onmousemove = L.Util.falseFn;
		return tile;
	},

	_loadTile: function (tile, tilePoint) {
		tile._layer = this;
		tile._tileId = this._map._zoom+'/'+tilePoint.x+'/'+tilePoint.y,

		$.ajax({
			url: this.getTileUrl(tilePoint),
			dataType: this.options.dataType,
			cache: this.options.cache,

			success: function(data) {
				var
					layer = tile._layer,
					map = layer._map,
					vectorLayer = L.geoJson(data, {
						style: layer.options.style
					});

				layer._propagateTileInfo(vectorLayer, tilePoint);

				// TODO: fade in
				vectorLayer.addTo(map);
				layer._tileOnLoad.call(tile);
			},
			error: function() {
				tile._layer._tileOnError.call(tile);
			}
		});
	},

	_addTile: function (tilePoint, container) {
		L.TileLayer.prototype._addTile.call(this, tilePoint, container);
		this._updateClipPath(tilePoint);
	},

	_updateClipPath: function(tilePoint) {
		if(L.Path.SVG) {
			var map = this._map,
				tileSize = this.options.tileSize,
				cpId = 'cp-'+map._zoom+'-'+tilePoint.x+'-'+tilePoint.y,
				pathRoot = map._pathRoot,
				clipRect = this._svgClipRects[cpId];

			if(!clipRect) {
				var defs = this._svgDefsSection;

				// find/create defs section
				if(!defs) {
					defs = pathRoot.getElementsByTagName('defs');
					if(defs.length > 0) {
						defs = defs[0];
					}
					else {
						defs = L.GeoJsonTileLayer._createElement('defs');
						pathRoot.appendChild(defs);
					}
				}

				clipPath = L.GeoJsonTileLayer._createElement('clipPath');
				clipPath.setAttribute('id', cpId);
				defs.appendChild(clipPath);
				
				clipRect = L.GeoJsonTileLayer._createElement('rect');
				clipPath.appendChild(clipRect);
				this._svgClipRects[cpId] = clipRect;
			}

			// get clip-px for tile point
			var crs = map.options.crs,
				nwPoint = tilePoint.multiplyBy(tileSize),
				sePoint = nwPoint.add(new L.Point(tileSize, tileSize)),

				nw = map.unproject(nwPoint),
				se = map.unproject(sePoint),
				tl = map.latLngToLayerPoint(nw),
				br = map.latLngToLayerPoint(se);

			var overlap = 0.5;
			clipRect.setAttribute('x', tl.x - overlap);
			clipRect.setAttribute('y', tl.y - overlap);
			clipRect.setAttribute('width', br.x - tl.x + overlap+overlap);
			clipRect.setAttribute('height', br.y - tl.y + overlap+overlap);
		}
		else {
			// TODO: VML
		}
	},

	_propagateTileInfo: function (vectorLayer, tilePoint) {
		if(!vectorLayer._layers) {
			vectorLayer._tilePoint = tilePoint;
			vectorLayer._tileContainers = this._tileContainers;
			return;
		};

		for(name in vectorLayer._layers) {
			if(!vectorLayer._layers.hasOwnProperty(name)) return;
			this._propagateTileInfo(vectorLayer._layers[name], tilePoint);
		}
	}
});

L.geoJsonTileLayer = function (url, options) {
	return new L.GeoJsonTileLayer(url, options);
};
