/* global L */
/* jshint camelcase: false */
'use strict';

require('leaflet-draw');

var MeasureControl = L.Control.extend({
  includes: L.Mixin.Events,
  options: {
    polygon: {
      allowIntersection: false,
      drawError: {
        color: '#f06eaa',
        timeout: 400,
        message: 'Invalid geometry'
      },
      shapeOptions: {
        color: 'rgb(255, 0, 0)',
        weight: 2
      },
      repeatMode: true
    },
    polyline: {
      shapeOptions: {
        color: 'rgb(255, 0, 0)',
        weight: 2
      },
      repeatMode: true
    },
    position:'topleft'
  },
  initialize: function(map, options) {
    L.Util.setOptions(this, options);
    this._activeMode = null;
    this._drawnGroup = new L.FeatureGroup();
    this._pastUnit = '';
    this._Unit = '';
    this._modes = {};

    return this;
  },
  onAdd: function(map) {
    var  container = L.DomUtil.create('div', 'npmap-control-measure leaflet-bar leaflet-control'),
      me = this,
      liArea, liDistance, liSelect;

    this._menu = L.DomUtil.create('ul', '', container);
    liArea = L.DomUtil.create('li', '', this._menu);
    liDistance = L.DomUtil.create('li', '', this._menu);
    liSelect = L.DomUtil.create('li', '', this._menu);
    this._button = L.DomUtil.create('button', 'leaflet-bar-single measure-control', container);
    this._buttonArea = L.DomUtil.create('button', 'polygon', liArea);
    this._buttonArea.innerHTML = 'Area';
    this._buttonDistance = L.DomUtil.create('button', 'pressed polyline', liDistance);
    this._buttonDistance.innerHTML = 'Distance';
    this._selectUnit = L.DomUtil.create('select','measure-units', liSelect);
    this._selectUnit.id = 'measure-units';
   
    this._listeners(map, me);
    this._initializeMode(this._buttonDistance, new L.Draw.Polyline(map, this.options.polyline));
    this._initializeMode(this._buttonArea, new L.Draw.Polygon(map, this.options.polygon));

    return container;
  },
  _listeners: function(map, me) {
    L.DomEvent
      .on(this._button, 'click', this._toggleMeasure, this)
      .disableClickPropagation(this._button)
      .on(this._buttonArea, 'click', this._buttonAreaClick, this)
      .on(this._buttonDistance, 'click', this._buttonDistanceClick, this)
      .on(this._selectUnit, 'change', this._selectVal, this)
      .on(this._map, 'mousemove', this._mouseMove, this)
      .disableClickPropagation(this._menu);

    map.addLayer(this._drawnGroup);
    map.on('draw:created', function(e) {
      me._drawnGroup.addLayer(e.layer);
    });
  },
  _buttonAreaClick: function() {
    if (this._optionArea === 'ha'){
      this._selectUnit.innerHTML = '' +
      '<option value="acres" class="area">Acres</option>' +
      '<option value="ha" class="polygon" selected>Hectares</option>' +
    '';
    } else {
      this._selectUnit.innerHTML = '' +
        '<option value="acres" class="area" selected>Acres</option>' +
        '<option value="ha" class="polygon">Hectares</option>' +
      '';
    }
    this._buttonDistance.disabled = false;
    this._buttonArea.disabled = true;
    this._buttonClick(this._buttonArea);
    this._selectVal();
  },
  _buttonClick: function(button) {
    if (!L.DomUtil.hasClass(button, 'pressed')) {
      var add = this._buttonArea,
        mode = button.className,
        remove = this._buttonDistance;

      if (mode === 'polyline') {
        add = this._buttonDistance;
        remove = this._buttonArea;
      }

      L.DomUtil.removeClass(remove, 'pressed');
      L.DomUtil.addClass(add, 'pressed');
      this._startMeasuring(mode);
      this._clicked = mode;
    }
  },
  _buttonDistanceClick: function() {

    if (this._optionDistance === 'mi'){
      this._selectUnit.innerHTML = '' +
        '<option value="mi" class="polyline" selected>Miles</option>' +
        '<option value="meters" class="distance">Meters</option>' +
        '<option value="ft" class="distance">Feet</option>' +
      '';
    } else if (this._optionDistance === 'ft'){
      this._selectUnit.innerHTML = '' +
        '<option value="mi" class="polyline" selected>Miles</option>' +
        '<option value="meters" class="distance">Meters</option>' +
        '<option value="ft" class="distance" selected>Feet</option>' +
      '';
    } else {
      this._selectUnit.innerHTML = '' +
        '<option value="mi" class="polyline">Miles</option>' +
        '<option value="meters" class="distance" selected>Meters</option>' +
        '<option value="ft" class="distance">Feet</option>' +
      '';
    }

    this._buttonDistance.disabled = true;
    this._buttonArea.disabled = false;
    this._buttonClick(this._buttonDistance);
    this._pastUnit = 'meters';
    this._selectVal();
  },
  _calculateArea: function(val) {
    var options = this._selectUnit.options,
      unitChange;

    for (var i = 0; i < options.length; i++) {
      this._optionArea = options[options.selectedIndex].value;

      if (this._optionArea !== undefined) {
        if (this._pastUnit === 'acres' || this._pastUnit === 'meters'){
          if (this._optionArea === 'ha'){
            unitChange = val * 0.404686;
          } else if (this._optionArea === 'acres') {
            unitChange = val;
          }
        } else if (this._pastUnit === 'ha') {
          if (this._optionArea === 'acres') {
            unitChange = val * 2.47105;
          } else if (this._optionArea === 'ha'){
            unitChange = val;
          }
        }

        return unitChange.toFixed(2) + ' ' + this._optionArea;
      }
    }
  },
  _calculateDistance: function(val) {
    var options = this._selectUnit.options;

    for (var i = 0; i < options.length; i++){
      this._optionDistance = options[options.selectedIndex].value;

      if (this._optionDistance !== undefined) {
        var unitChange;

        if (this._pastUnit === 'meters') {
          if (this._optionDistance === 'mi'){
            unitChange = val * 0.000621371;
          } else if (this._optionDistance === 'ft') {
            unitChange = val * 3.28084;
          } else if (this._optionDistance === 'meters') {
            unitChange = val;
          }
        } else if (this._pastUnit === 'mi') {
          if (this._optionDistance === 'ft') {
            unitChange = val * 5280;
          } else if (this._optionDistance === 'meters') {
            unitChange = val * 1609.34;
          } else if (this._optionDistance === 'mi'){
            unitChange = val;
          }
        } else if (this._pastUnit === 'ft') {
          if (this._optionDistance === 'mi') {
            unitChange = val * 0.000189394;
          } else if (this._optionDistance === 'meters') {
            unitChange = val * 0.3048;
          } else if (this._optionDistance === 'ft'){
            unitChange = val;
          }
        }

        return unitChange.toFixed(2) + ' ' + this._optionDistance;
      }
    }
  },
  _createTooltip: function(position) {
    var icon = L.divIcon({
      className: 'leaflet-measure-tooltip unit-'+ this._Unit,
      iconAnchor: [-5, -5]
    });

    this._tooltip = L.marker(position, {
      clickable: false,
      icon: icon
    }).addTo(this._drawnGroup);
  },
  _handlerActivated: function(e) {
    if (this._activeMode && this._activeMode.handler.enabled()) {
      this._activeMode.handler.disable();
    }
    
    this._activeMode = this._modes[e.handler];
    this.fire('enable');
  },
  _handlerDeactivated: function() {
    this._activeMode = null;
    this.fire('disable');
    this._lastCircle = undefined;
    this._currentCircles = [];
    this._layerGroupPathTemp = this._layerGroupPath = undefined;
    this._lastPoint = undefined;
    this._area = 0;
    this._distance = 0;
  },
  _initializeMode: function(button, handler) {
    var type = handler.type,
      me = this;
   
    this._modes[type] = {};
    this._modes[type].button = this._buttonDistance;
    this._modes[type].handler = handler;

    L.DomEvent.on(button, 'click', function() {
      if (me._activeMode === type) {
        me._modes[type].handler.disable();
      } else {
        me._modes[type].handler.enable();
      }
    }, this._modes[type].handler);

    this._modes[type].handler
      .on('disabled', this._handlerDeactivated, this)
      .on('enabled', this._handlerActivated, this);
  },
  _onKeyDown: function (e) {
    if(e.keyCode === 27) {
      this._toggleMeasure();
    }
  },
  _mouseMove: function(e) {
    var latLng = e.latlng;

    if (!latLng || !this._lastPoint) {
      return;
    }

    if (this._clicked === 'polyline') {
      this._mouseDistance(latLng);
    } else {
      this._mouseArea(latLng);
    }
  },
  _mouseArea: function(latLng) {
    this._layerGroupPath.addLatLng(latLng);

    if (this._currentCircles !== undefined) {
      var metersSq = L.GeometryUtil.geodesicArea(this._layerGroupPath.getLatLngs());
      this._area = metersSq * 0.000247105;
    } else {
      this._area = 0;
    }

    if (this._tooltip && this._currentCircles.length > 2) {
      this._updateTooltipPosition(latLng);
      this._updateTooltipArea(this._area);
    }
  },
  _mouseDistance: function(latLng) {
    if (!this._layerGroupPathTemp) {
      this._layerGroupPathTemp = L.polyline([this._lastPoint, latLng]);
    } else {
      this._layerGroupPathTemp.spliceLatLngs(0, 2, this._lastPoint, latLng);
    }

    if (this._tooltip) {
      var distance = latLng.distanceTo(this._lastPoint);

      if (!this._distance) {
        this._distance = 0;
      }
      this._updateTooltipPosition(latLng);
      this._updateTooltipDistance(this._distance + distance, distance);
    }
  },
  _mouseClickArea: function(e) {
    if (this._clicked === 'polygon'){
      var latLng = e.latlng,
        circle;

      this._Unit = 'acres';

      if (!latLng) {
        return;
      }

      if (this._layerGroupPath ) {
        if (this._pointLength === document.getElementsByClassName('leaflet-div-icon').length) {
          return;
        } else {
          var metersSq;

          this._layerGroupPath.addLatLng(latLng);
          metersSq = L.GeometryUtil.geodesicArea(this._layerGroupPath.getLatLngs());
          this._area = metersSq * 0.000247105;
          circle = new L.CircleMarker(latLng);
          this._currentCircles.push(circle);
          this._pointLength = document.getElementsByClassName('leaflet-div-icon').length;
          
          if (this._currentCircles.length > 1) {
            this._updateTooltipPosition(latLng);
            this._updateTooltipArea(this._area);

            L.DomEvent.on(this._map, 'mousemove', this._mouseMove, this);
          }
        }
      } else {
        this._layerGroupPath = L.polygon([latLng]);
      }

      if (this._currentCircles.length > 0){
        this._createTooltip(latLng);
      }
      this._lastPoint = latLng;
    }
  },
  _mouseClickDistance: function(e) {
    if (this._clicked === 'polyline'){
      var latLng = e.latlng;

      this._Unit = 'meters';

      if (!latLng) {
        return;
      }

      // if (this._pastUnit === '' || this._pastUnit === 'acres' || this._pastUnit === 'ha'){
      //   this._pastUnit = 'meters';
      // }

      if (!this._tooltip) {
        this._tooltip = this._createTooltip(latLng);
      }

      if (this._lastPoint && this._tooltip) {
        var distance = latLng.distanceTo(this._lastPoint);

        this._updateTooltipPosition(latLng);
        this._updateTooltipDistance(this._distance + distance, distance);

        this._distance += distance;
      }

      if (this._distance !== 0){
        this._createTooltip(latLng);
      }

      if (this._lastCircle) {
        this._drawnGroup.removeLayer(this._lastCircle);
      }

      this._lastCircle = new L.CircleMarker(latLng);
      this._lastPoint = latLng;
      this._lastCircle.on('click', function() {
        this._handlerDeactivated();
      }, this);
    }
  },
  _selectVal: function() {
    var area = L.npmap.util._.getElementsByClassName('leaflet-measure-tooltip unit-acres'),
      distance = L.npmap.util._.getElementsByClassName('leaflet-measure-tooltip unit-meters'),
      total = L.npmap.util._.getElementsByClassName('leaflet-measure-tooltip-total');
    if (this._selectUnit) {
      for (var i = 0; i < total.length; i++) {
        var parentElement = total[i].parentNode;

        if (area.indexOf(parentElement) > -1) {
          this._selectUnitArea(total[i]);
        }
        if (distance.indexOf(parentElement) > -1) {
          this._selectUnitDistance(total[i]);
        }
      }

      this._pastUnit = this._selectUnit.options[this._selectUnit.options.selectedIndex].value;
    }
  },
  _selectUnitArea: function(tooltip) {
    if (tooltip.innerHTML !== '') {
      var newArea, newTotal;

      if (tooltip !== undefined || tooltip !== null){
        newTotal = tooltip.innerHTML.match(/\d+\.\d\d(?!\d)/)[0];
      }

      newArea = this._calculateArea(newTotal);

      if (newArea !== undefined){
        tooltip.innerHTML = newArea;
      }
    }
  },
  _selectUnitDistance: function(tooltip) {
    if (this._clicked === 'polyline'){
      var total = tooltip.innerHTML;

      if (total !== '') {
        var difference = L.npmap.util._.getNextSibling(tooltip),
          newDifference, newDistance, newMeasurement, newTotal;

        if (tooltip !== undefined) {
          newTotal = tooltip.innerHTML.match(/\d+\.\d\d(?!\d)/)[0];
          newDistance = this._calculateDistance(newTotal);
        }

        if (difference !== null) {
          newMeasurement = difference.innerHTML.match(/\d+\.\d\d(?!\d)/)[0];
          newDifference = this._calculateDistance(newMeasurement);
        }

        if (newDistance !== undefined) {
          tooltip.innerHTML = newDistance;

          if (difference !== null) {
            difference.innerHTML = '(+' + newDifference + ')';
          }
        }
      }
    }
  },
  _startMeasuring: function(type) {
    var clickFn = (type === 'polygon' ? this._mouseClickArea : this._mouseClickDistance),
      map = this._map;

    map.doubleClickZoom.disable();
    this._currentCircles = [];
    this._tooltip = undefined;

    L.DomEvent
      .on(document, 'keydown', this._onKeyDown, this)
      .on(map, 'click', clickFn, this)
      .on(map, 'dblclick', this._handlerDeactivated, this)
      .on(map, 'mousemove', this._mouseMove, this);
  },
  _stopMeasuring: function(type) {
    var clickFn = (type === 'polygon' ? this._mouseClickArea : this._mouseClickDistance),
      map = this._map;

    if (this._clicked === 'polyline') {
      if (this._doubleClickZoom) {
        this._map.doubleClickZoom.enable();
      }
    }

    if (this._drawnGroup) {
      this._drawnGroup.clearLayers();
    }

    L.DomEvent
      .off(document, 'keydown', this._onKeyDown, this)
      .off(map, 'click', clickFn, this)
      .off(map, 'dblclick', this._handlerDeactivated, this)
      .off(map, 'mousemove', this._mouseMove, this);
  },
  _toggleMeasure: function() {
    var map = this._map;

    if (L.DomUtil.hasClass(this._button, 'pressed')) {
      L.DomUtil.removeClass(this._button, 'pressed');
      this._menu.style.display = 'none';
      this._activeMode.handler.disable();
      this._stopMeasuring(this._clicked);
      this._drawnGroup.clearLayers();

      if (this._doubleClickZoom) {
        map.doubleClickZoom.enable();
      }

      this._doubleClickZoom = null;
    } else {
      L.DomUtil.addClass(this._button, 'pressed');
      this._menu.style.display = 'block';
      this._buttonDistance.click();
      this._clicked = 'polyline';
      this._startMeasuring(this._clicked);
      this._pastUnit = 'meters';
    }
  },
  _updateTooltipArea: function(total) {
    this._tooltip._icon.innerHTML = '<div id="draw-tooltip-total" class="leaflet-measure-tooltip-total">' + this._calculateArea(total) + '</div>';
  },
  _updateTooltipDistance: function(total, difference) {
    var totalDistance = this._calculateDistance(total),
      differenceDistance = this._calculateDistance(difference),
      text = '<div id="draw-tooltip-total" class="leaflet-measure-tooltip-total">' + totalDistance + '</div>';

    if (differenceDistance !== totalDistance && difference !== 0) {
      text += '<div id="draw-tooltip-difference" class="leaflet-measure-tooltip-difference">(+' + differenceDistance + ')</div>';
    }

    this._tooltip._icon.innerHTML = text;
  },
  _updateTooltipPosition: function(position) {
    this._tooltip.setLatLng(position);
  }
});

L.Map.mergeOptions({
  measureControl: false
});

L.Map.addInitHook(function() {
  if (this.options.measureControl) {
    var options = {};

    if (typeof this.options.measureControl === 'object'){
      options = this.options.measureControl;
    }

    this.measureControl = L.npmap.control.measure(options).addTo(this);
  }
});

module.exports = function(options){
  return new MeasureControl(options);
};