// add tiled vector feature support
L.Path.include({
	_initPath: function() {
		if(L.Path.SVG)
		{
			//this._container = this._createElement('g');
			
			this._path = this._createElement('path');
			//this._container.appendChild(this._path);

			// tiled vector feature support
			if(this._tileInfo) {
				var map = this._map,
					pathRoot = map._pathRoot,
					tileInfo = this._tileInfo,
					clipInfo = tileInfo.clipInfo,
					tilePoint = tileInfo.tilePoint,
					tileId = map._zoom+'/'+tilePoint.x+'/'+tilePoint.y,
					tileContainer = this._tileContainers[tileId];

				if(!tileContainer) {
					// find/create defs section
					var defs = pathRoot.getElementsByTagName('defs');
					if(defs.length > 0) {
						defs = defs[0];
					}
					else {
						defs = this._createElement('defs');
						pathRoot.appendChild(defs);
					}

					// find/create clipPath
					var
						cpId = 'cp-'+map._zoom+'-'+tilePoint.x+'-'+tilePoint.y,
						clipPath = document.getElementById(cpId), // TODO: uniqness of id
						clipRect = null;

					if(!clipPath) {
						clipPath = this._createElement('clipPath');
						clipPath.setAttribute('id', cpId);
						defs.appendChild(clipPath);
						
						clipRect = this._createElement('rect');
						clipPath.appendChild(clipRect);
					}
					else {
						clipRect = clipPath.getElementsByTagName('rect')[0];
					}

					// TODO: fix overlap / thin-lines-bug
					clipRect.setAttribute('x', clipInfo[0].x - 0.5);
					clipRect.setAttribute('y', clipInfo[0].y - 0.5);
					clipRect.setAttribute('width', clipInfo[1].x - clipInfo[0].x + 0.5);
					clipRect.setAttribute('height', clipInfo[1].y - clipInfo[0].y + 0.5);
					tileContainer = this._createElement('g');

					//tileContainer.setAttribute('data-tile-x', tilePoint.x);
					//tileContainer.setAttribute('data-tile-y', tilePoint.y);
					//tileContainer.setAttribute('data-tile-zoom', map._zoom);
					tileContainer.setAttribute('clip-path', 'url(#'+cpId+')');

					this._tileContainers[tileId] = tileContainer;


				}

				tileContainer.appendChild(this._path);
				this._container = tileContainer;
			}
		}
		else
		{

		}
	}
});

L.GeoJsonTileLayer = L.TileLayer.extend({
	includes: {
		_tileContainers: {}
	},

	options: {
		unloadInvisibleTiles: true
	},

	initialize: function(url, options) {
		L.TileLayer.prototype.initialize.call(this, url, options);

		this.on('tileunload', function(info) {
			var
				tileId = info.tile._tileId,
				tileContainer = this._tileContainers[tileId];

			// TODO: fade out
			if(tileContainer) tileContainer.parentNode.removeChild(tileContainer);
		});
	},

	_createTileProto: function() {
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

		//if(!(tilePoint.x == 3 && tilePoint.y == 4)) return;

		$.ajax({
			url: this.getTileUrl(tilePoint),
			dataType: 'json',
			cache: true,

			success: function(data) {
				var
					layer = tile._layer,
					map = layer._map,
					vectorLayer = L.geoJson(data, {
						style: layer.options.style
					});

				// get clip-px for tile point
				var crs = map.options.crs,
					tileSize = layer.options.tileSize,

					nwPoint = tilePoint.multiplyBy(tileSize),
					sePoint = nwPoint.add(new L.Point(tileSize, tileSize)),

					nw = map.unproject(nwPoint, map._zoom),
					se = map.unproject(sePoint, map._zoom),
					clipInfo = [map.latLngToLayerPoint(nw), map.latLngToLayerPoint(se)];

				//console.log(tilePoint+' @'+map._zoom+' -> '+nw+' '+se);
				layer._propagateTileInfo(vectorLayer, {'tilePoint': tilePoint, 'clipInfo': clipInfo});

				// TODO: fade in
				vectorLayer.addTo(map);
				layer._tileOnLoad.call(tile);
			},
			error: function() {
				tile._layer._tileOnError.call(tile);
			}
		});
	},

	_propagateTileInfo: function(vectorLayer, tileInfo) {
		if(!vectorLayer._layers) {
			vectorLayer._tileInfo = tileInfo;
			vectorLayer._tileContainers = this._tileContainers;
			return;
		};

		for(name in vectorLayer._layers) {
			if(!vectorLayer._layers.hasOwnProperty(name)) return;
			this._propagateTileInfo(vectorLayer._layers[name], tileInfo);
		}
	}
});

L.geoJsonTileLayer = function (url, options) {
	return new L.GeoJsonTileLayer(url, options);
};
