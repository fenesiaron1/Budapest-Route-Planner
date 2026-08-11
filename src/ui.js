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
import { map, markerLayer, routeLayer, geolocLayer, geolocStyle, markerStyle, routeStyle, addMarker, savedLayer, stationsLayer, getSavedMarker, setSavedMarker, removeSavedMarker, loadSavedMarkers, setMapTheme, persistTheme, loadTheme } from './map.js';
import { getGeolocation, geolocMarker } from './geolocation.js';
import { drawRoute, routingEvents } from './routing.js';

// The two route-selection markers. Null if not selected yet.
var currentSelectedMarker1 = null;
var currentSelectedMarker2 = null;

// Set to a saved-location type, null if not placing a saved location.
var placingType = null;

// References to route controls/info panel.
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
const transportModeEl = document.getElementById('transportMode');

// References to saved-places side panel.
const savedToggleBtn = document.getElementById('savedToggleBtn');
const savedPanel = document.getElementById('savedPanel');
const savedTypes = ['home', 'workplace', 'study', 'favorite'];

// References to station info section in the side panel.
const stationInfoEl = document.getElementById('stationInfo');
const stationNameEl = document.getElementById('stationName');
const stationTypeEl = document.getElementById('stationType');
const stationDescriptionEl = document.getElementById('stationDescription');

// Shows/hides the route controls and info panel depending on whether both route markers are selected.
function updateUI() {
    const bothSelected = currentSelectedMarker1 !== null && currentSelectedMarker2 !== null;
    controlsEl.classList.toggle('visible', bothSelected);
    if (!bothSelected) panelEl.classList.remove('visible');
}

// Clears both route-selection markers and the drawn route.
function resetMarkers() {
    markerLayer.getSource().clear();
    currentSelectedMarker1 = null;
    currentSelectedMarker2 = null;
    routeLayer.getSource().clear();
    updateUI();
}

// Uses a coordinate (from geolocation, a saved location, or a station) as the next route-selection marker
function selectAsRouteMarker(coord) {
    if(currentSelectedMarker1 === null) currentSelectedMarker1 = addMarker(coord);
    else if(currentSelectedMarker2 === null) currentSelectedMarker2 = addMarker(coord);
    else resetMarkers();
    updateUI();
}

// Updates each saved-places row's Add/Modify label and Delete button
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

// Fills in the route info panel whenever any routing function finishes.
routingEvents.addEventListener('routecalculated', (event) => {
    const { startCoord, endCoord, data, recommendation, profile } = event.detail;
    startCoordEl.textContent = startCoord.map(c => c.toFixed(5)).join(', ');
    endCoordEl.textContent = endCoord.map(c => c.toFixed(5)).join(', ');
    distanceEl.textContent = (data.routes[0].distance / 1000).toFixed(2) + ' km';
    durationEl.textContent = Math.round(data.routes[0].duration / 60) + ' min';
    if(recommendation !== '')
      routeRecommendationEl.textContent = recommendation;
    profileSelect.value = profile;
    transportModeEl.textContent = profileSelect.options[profileSelect.selectedIndex].text;
    panelEl.classList.add('visible');
});

// Resets the selection and warns the user if a routing request fails.
routingEvents.addEventListener('routecalculationerror', () => {
    alert("Error calculating route");
    resetMarkers();
    updateUI();
});

// Main map click handler. Places a saved location or a route marker depending on placingType.
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

// Changes the cursor when placing a saved location or hovering over a clickable marker.
map.on('pointermove', function (event) {
    const features = map.getFeaturesAtPixel(event.pixel);
    const overClickable = features.some(feature => feature === geolocMarker) ||
        features.some(feature => savedLayer.getSource().getFeatures().includes(feature)) ||
        features.some(feature => stationsLayer.getSource().getFeatures().includes(feature));
    map.getTargetElement().style.cursor = placingType !== null ? 'crosshair' : (overClickable ? 'pointer' : '');
});

// Plan route always uses the 'default'  profile.
planBtn.addEventListener('click', function () {
  if (currentSelectedMarker1 !== null && currentSelectedMarker2 !== null) {
    drawRoute(currentSelectedMarker1, currentSelectedMarker2, 'default');
  }
});

clearBtn.addEventListener('click', function () {
  resetMarkers();
});

// Recalculates the route whenever the travel mode dropdown changes.
profileSelect.addEventListener('change', function () {
  if (currentSelectedMarker1 !== null && currentSelectedMarker2 !== null && !panelEl.classList.contains('hidden')) {
    drawRoute(currentSelectedMarker1, currentSelectedMarker2, profileSelect.value);
  }
});

// Right-clicking a station marker shows its details in the side panel
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

// Toggles the side panel
savedToggleBtn.addEventListener('click', function () {
  savedPanel.classList.toggle('open');
});

// Handles Add/Modify and Delete clicks for any saved-place row.
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

// Applies and persists the theme whenever a radio button is selected
document.querySelectorAll('input[name="theme"]').forEach(radio => {
  radio.addEventListener('change', function () {
    if (!this.checked) return;
    document.body.classList.toggle('dark-mode', this.value === 'dark');
    setMapTheme(this.value);
    persistTheme(this.value);
  });
});

// Initializes the saved-places panel and theme on page load from localStorage.
loadSavedMarkers();
updateSavedPanel();

const savedTheme = loadTheme();
const savedThemeRadio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
if (savedThemeRadio) savedThemeRadio.checked = true;
document.body.classList.toggle('dark-mode', savedTheme === 'dark');
setMapTheme(savedTheme);