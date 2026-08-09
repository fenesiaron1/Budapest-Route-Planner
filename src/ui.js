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
import { map, markerLayer, routeLayer, geolocLayer, geolocStyle, markerStyle, routeStyle, addMarker, savedLayer, stationsLayer, getSavedMarker, setSavedMarker, removeSavedMarker, loadSavedMarkers } from './map.js';
import { getGeolocation, geolocMarker } from './geolocation.js';
import { drawRoute, routingEvents } from './routing.js';

var currentSelectedMarker1 = null;
var currentSelectedMarker2 = null;

var placingType = null;

const controlsEl = document.getElementById('controls');
const panelEl = document.getElementById('panel');
const planBtn = document.getElementById('planBtn');
const clearBtn = document.getElementById('clearBtn');
const profileSelect = document.getElementById('profile');
const startCoordEl = document.getElementById('startCoord');
const endCoordEl = document.getElementById('endCoord');
const distanceEl = document.getElementById('distance');
const durationEl = document.getElementById('duration');
const routeRecommendationEl = document.getElementById('routeRecommendation');

const savedToggleBtn = document.getElementById('savedToggleBtn');
const savedPanel = document.getElementById('savedPanel');
const savedTypes = ['home', 'workplace', 'study', 'favorite'];

const stationInfoEl = document.getElementById('stationInfo');
const stationNameEl = document.getElementById('stationName');
const stationTypeEl = document.getElementById('stationType');
const stationDescriptionEl = document.getElementById('stationDescription');

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

function selectAsRouteMarker(coord) {
    if(currentSelectedMarker1 === null) currentSelectedMarker1 = addMarker(coord);
    else if(currentSelectedMarker2 === null) currentSelectedMarker2 = addMarker(coord);
    else resetMarkers();
    updateUI();
}

function updateSavedPanel() {
    savedTypes.forEach(type => {
        const row = savedPanel.querySelector(`.saved-row[data-type="${type}"]`);
        const actionBtn = row.querySelector('.saved-action');
        const deleteBtn = row.querySelector('.saved-delete');
        const exists = getSavedMarker(type) !== undefined;
        actionBtn.textContent = exists ? 'Modify' : 'Add';
        deleteBtn.hidden = !exists;
    });
}

routingEvents.addEventListener('routecalculated', (event) => {
    const { startCoord, endCoord, data, recommendation, profile } = event.detail;
    startCoordEl.textContent = startCoord.map(c => c.toFixed(5)).join(', ');
    endCoordEl.textContent = endCoord.map(c => c.toFixed(5)).join(', ');
    distanceEl.textContent = (data.routes[0].distance / 1000).toFixed(2) + ' km';
    durationEl.textContent = Math.round(data.routes[0].duration / 60) + ' min';
    if(recommendation !== '')
      routeRecommendationEl.textContent = recommendation;
    profileSelect.value = profile;
    panelEl.classList.add('visible');
});

routingEvents.addEventListener('routecalculationerror', () => {
    alert("Error calculating route");
    resetMarkers();
    updateUI();
});

map.on('click', function (event) {
    if (placingType !== null) {
        const type = placingType;
        placingType = null;
        setSavedMarker(type, event.coordinate);
        updateSavedPanel();
        return;
    }

    const features = map.getFeaturesAtPixel(event.pixel);

    if (features.some(feature => feature === geolocMarker)) {
        selectAsRouteMarker(geolocMarker.getGeometry().getCoordinates());
        return;
    }

    const savedFeature = features.find(feature => savedLayer.getSource().getFeatures().includes(feature));
    if (savedFeature) {
        selectAsRouteMarker(savedFeature.getGeometry().getCoordinates());
        return;
    }

    const stationFeature = features.find(feature => stationsLayer.getSource().getFeatures().includes(feature));
    if (stationFeature) {
        selectAsRouteMarker(stationFeature.getGeometry().getCoordinates());
        return;
    }

    if(currentSelectedMarker1 === null) currentSelectedMarker1 = addMarker(event.coordinate);
    else if(currentSelectedMarker2 === null) currentSelectedMarker2 = addMarker(event.coordinate);
    else resetMarkers();
    updateUI();
});

map.on('pointermove', function (event) {
    const features = map.getFeaturesAtPixel(event.pixel);
    const overClickable = features.some(feature => feature === geolocMarker) ||
        features.some(feature => savedLayer.getSource().getFeatures().includes(feature)) ||
        features.some(feature => stationsLayer.getSource().getFeatures().includes(feature));
    map.getTargetElement().style.cursor = placingType !== null ? 'crosshair' : (overClickable ? 'pointer' : '');
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    resetMarkers();
    placingType = null;
    savedPanel.classList.remove('open');
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
    drawRoute(currentSelectedMarker1, currentSelectedMarker2, 'default');
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

map.getViewport().addEventListener('contextmenu', function (event) {
  event.preventDefault();
  const feature = map.getFeaturesAtPixel(map.getEventPixel(event))
    .find(feature => stationsLayer.getSource().getFeatures().includes(feature));
  if (!feature) return;
 
  stationNameEl.textContent = feature.get('name');
  stationTypeEl.textContent = feature.get('type');
  stationDescriptionEl.textContent = feature.get('description');
  stationInfoEl.hidden = false;
  savedPanel.classList.add('open');
});

savedToggleBtn.addEventListener('click', function () {
  savedPanel.classList.toggle('open');
});

savedPanel.addEventListener('click', function (event) {
  const row = event.target.closest('.saved-row');
  if (!row) return;
  const type = row.dataset.type;

  if (event.target.classList.contains('saved-action')) {
    placingType = type;
  } else if (event.target.classList.contains('saved-delete')) {
    removeSavedMarker(type);
    updateSavedPanel();
  }
});

loadSavedMarkers();
updateSavedPanel();