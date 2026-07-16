import './style.css';
import {Map, View} from 'ol';
import { fromLonLat, toLonLat } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Icon, Style } from 'ol/style';
import LineString from 'ol/geom/LineString.js';
import Stroke from 'ol/style/Stroke.js';
import { map, markerLayer, routeLayer, geolocLayer, geolocStyle, markerStyle, routeStyle, addMarker } from './map.js';
import { getGeolocation, geolocMarker } from './geolocation.js';
import { drawRoute, routingEvents } from './routing.js';

var currentSelectedMarker1 = null;
var currentSelectedMarker2 = null;

const controlsEl = document.getElementById('controls');
const panelEl = document.getElementById('panel');
const planBtn = document.getElementById('planBtn');
const clearBtn = document.getElementById('clearBtn');
const profileSelect = document.getElementById('profile');
const startCoordEl = document.getElementById('startCoord');
const endCoordEl = document.getElementById('endCoord');
const distanceEl = document.getElementById('distance');
const durationEl = document.getElementById('duration');

function updateUI() {
    const bothSelected = currentSelectedMarker1 !== null && currentSelectedMarker2 !== null;
    controlsEl.classList.toggle('visible', bothSelected);
    if (!bothSelected) panelEl.classList.remove('visible');
}

function resetMarkers() {
    markerLayer.getSource().clear();
    currentSelectedMarker1 = null;
    currentSelectedMarker2 = null;
    routeLayer.getSource().clear();
    updateUI();
}

routingEvents.addEventListener('routecalculated', (event) => {
    const { startCoord, endCoord, data } = event.detail;
    startCoordEl.textContent = startCoord.map(c => c.toFixed(5)).join(', ');
    endCoordEl.textContent = endCoord.map(c => c.toFixed(5)).join(', ');
    distanceEl.textContent = (data.routes[0].distance / 1000).toFixed(2) + ' km';
    durationEl.textContent = Math.round(data.routes[0].duration / 60) + ' min';
    panelEl.classList.add('visible');
});

map.on('click', function (event) {
    if(map.getFeaturesAtPixel(event.pixel).some(feature => feature === geolocMarker)) {
      resetMarkers();
      currentSelectedMarker1 = addMarker(geolocMarker.getGeometry().getCoordinates());
      updateUI();
      return;
    }

    if(currentSelectedMarker1 === null) currentSelectedMarker1 = addMarker(event.coordinate);
    else if(currentSelectedMarker2 === null) currentSelectedMarker2 = addMarker(event.coordinate);
    else resetMarkers();
    updateUI();
});

map.on('pointermove', function (event) {
    map.getTargetElement().style.cursor = map.getFeaturesAtPixel(event.pixel).some(feature => feature === geolocMarker) ? 'pointer' : '';
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    resetMarkers();
  }
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'r') {
    if (currentSelectedMarker1 !== null && currentSelectedMarker2 !== null && routeLayer.getSource().getFeatures().length === 0) {
      drawRoute(currentSelectedMarker1, currentSelectedMarker2, profileSelect.value);
    }
  }
});

planBtn.addEventListener('click', function () {
  if (currentSelectedMarker1 !== null && currentSelectedMarker2 !== null) {
    drawRoute(currentSelectedMarker1, currentSelectedMarker2, profileSelect.value);
  }
});

clearBtn.addEventListener('click', function () {
  resetMarkers();
});

profileSelect.addEventListener('change', function () {
  if (currentSelectedMarker1 !== null && currentSelectedMarker2 !== null && !panelEl.classList.contains('hidden')) {
    drawRoute(currentSelectedMarker1, currentSelectedMarker2, profileSelect.value);
  }
});


