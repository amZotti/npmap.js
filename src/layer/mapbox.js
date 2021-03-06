/* global document, L */
/* jslint node: true */

'use strict';

var reqwest = require('reqwest'),
  util = require('../util/util');

var MapBoxLayer = L.TileLayer.extend({
  includes: [
    require('../mixin/grid')
  ],
  options: {
    accessToken: 'pk.eyJ1IjoibnBzIiwiYSI6IkdfeS1OY1UifQ.K8Qn5ojTw4RV1GwBlsci-Q',
    errorTileUrl: L.Util.emptyImageUrl,
    format: 'png',
    subdomains: [
      'a',
      'b',
      'c',
      'd'
    ]
  },
  statics: {
    FORMATS: [
      'jpg70',
      'jpg80',
      'jpg90',
      'png',
      'png32',
      'png64',
      'png128',
      'png256'
    ]
  },
  initialize: function(options) {
    var load;

    if (!options.id && !options.tileJson) {
      throw new Error('Mapbox layers require either an "id" or a "tileJson" property.');
    }

    if (options.format) {
      util.strictOneOf(options.format, MapBoxLayer.FORMATS);
    }

    load = options.tileJson || options.id;
    L.Util.setOptions(this, options);
    L.TileLayer.prototype.initialize.call(this, undefined, options);
    this._hasInteractivity = false;
    this._loadTileJson(load);
  },
  getTileUrl: function(tilePoint) {
    var tiles = this.options.tiles,
      templated = L.Util.template(tiles[Math.floor(Math.abs(tilePoint.x + tilePoint.y) % tiles.length)], tilePoint);

    if (!templated) {
      return templated;
    } else {
      return templated.replace('.png', (this._autoScale() ? '@2x' : '') + '.' + this.options.format);
    }
  },
  onAdd: function onAdd(map) {
    this._map = map;
    L.TileLayer.prototype.onAdd.call(this, this._map);
  },
  onRemove: function onRemove() {
    L.TileLayer.prototype.onRemove.call(this, this._map);
    delete this._map;
  },
  _autoScale: function() {
    return L.Browser.retina && this.options.autoscale;
  },
  _getGridData: function(latLng, callback) {
    var me = this;

    me._getTileGrid(me._getTileGridUrl(latLng), latLng, function(resultData, gridData) {
      if (resultData === 'loading') {
        callback({
          layer: me,
          results: 'loading'
        });
      } else {
        if (gridData) {
          callback({
            layer: me,
            results: [
              gridData
            ]
          });
        } else {
          callback({
            layer: me,
            results: null
          });
        }
      }
    });
  },
  _loadTileJson: function(from) {
    if (typeof from === 'string') {
      var me = this;

      reqwest({
        crossOrigin: true,
        error: function(error) {
          var obj = L.extend(error, {
            message: 'There was an error loading the data from Mapbox.'
          });

          me.fire('error', obj);
          me.errorFired = obj;
        },
        success: function(response) {
          me._setTileJson(response);
        },
        type: 'json',
        url: '//a.tiles.mapbox.com/v4/' + from + '.json?access_token=' + me.options.accessToken + (window.location.protocol === 'https:' ? '&secure=1' : '')
      });
    } else if (typeof from === 'object') {
      this._setTileJson(from);
    }
  },
  _setTileJson: function(json) {
    var me = this,
      extend;

    util.strict(json, 'object');

    extend = {
      attribution: (function() {
        if (me.options.attribution) {
          return me.options.attribution;
        } else if (json.attribution) {
          return json.attribution;
        } else {
          return null;
        }
      })(),
      autoscale: json.autoscale || false,
      bounds: json.bounds ? this._toLeafletBounds(json.bounds) : null,
      grids: json.grids ? json.grids : null,
      maxZoom: json.maxzoom,
      minZoom: json.minzoom,
      tiles: json.tiles,
      tms: json.scheme === 'tms'
    };

    if (typeof this.options.attribution === 'undefined') {
      extend.attribution = json.attribution;
    }

    if (this.options.clickable !== false) {
      this._hasInteractivity = typeof json.grids === 'object';
    }

    if (typeof this.options.maxZoom === 'undefined') {
      extend.maxZoom = json.maxzoom;
    }

    if (typeof this.options.minZoom === 'undefined') {
      extend.minZoom = json.minzoom;
    }

    L.extend(this.options, extend);
    this.tileJson = json;
    this.redraw();
    me.fire('ready');
    me.readyFired = true;
    return this;
  },
  _toLeafletBounds: function(_) {
    return new L.LatLngBounds([[_[1], _[0]], [_[3], _[2]]]);
  },
  _update: function() {
    if (this.options.tiles) {
      L.TileLayer.prototype._update.call(this);
    }
  }
});

module.exports = function(options) {
  return new MapBoxLayer(options);
};
