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

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  interactions: defaultInteractions({
        doubleClickZoom: false
    }),
  view: new View({
    center: fromLonLat([19.040235, 47.497912]),
    zoom: 12
  })
});

const markerLayer = new VectorLayer({
    source: new VectorSource({
        features: [],
    })
});
markerLayer.setZIndex(20);

const routeLayer = new VectorLayer({
    source: new VectorSource({
        features: []
    })
});

const geolocLayer = new VectorLayer({
    source: new VectorSource({
        features: [],
    })
});
geolocLayer.setZIndex(10);

const geolocStyle = new Style({
  image: new Icon({
    src: 'geoloc.png',
    anchor: [0.5, 1],
    scale: 0.04
  }),
});

const markerStyle = new Style({
  image: new Icon({
    src: 'marker.png',
    anchor: [0.5, 1],
    scale: 0.03
  }),
});
    
const routeStyle = new Style({
  stroke: new Stroke({
    color: 'red',
    width: 4
  })
});

map.addLayer(markerLayer);
map.addLayer(routeLayer);
map.addLayer(geolocLayer);

var geolocMarker = null;


function getGeolocation() {
  navigator.geolocation.getCurrentPosition(position => {
    const coords = [position.coords.longitude, position.coords.latitude];
    geolocMarker = new Feature({
      geometry: new Point(fromLonLat(coords)),
      zIndex: 1
    });
    geolocMarker.setStyle(geolocStyle);
    geolocLayer.getSource().addFeature(geolocMarker);
    
  }, 
    error => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
        alert("No permission for Geolocation.");
        break;
      default:
        alert("Geolocation error");
    }
  });
}
getGeolocation();

const permission = await navigator.permissions.query({
    name: 'geolocation'
});

permission.onchange = () => getGeolocation();

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

function addMarker(coord) {
  const marker = new Feature({
    geometry: new Point(coord),
    zIndex: 2
  });
  marker.setStyle(markerStyle);
  markerLayer.getSource().addFeature(marker);
  return marker;
}

async function drawRoute(startMarker, endMarker, profile = 'walking') {
  const startCoord = toLonLat(startMarker.getGeometry().getCoordinates());
  const endCoord = toLonLat(endMarker.getGeometry().getCoordinates());
  const url = `https://router.project-osrm.org/route/v1/${profile}/` +
  `${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}` +
  `?overview=full&geometries=geojson`;
  
  const response = await fetch(url);
  const data = await response.json();
  console.log(data);
  
  routeLayer.getSource().clear();
  const route = new Feature({
    geometry: new LineString(data.routes[0].geometry.coordinates.map(coord => fromLonLat(coord)))
  });
  route.setStyle(routeStyle);
  routeLayer.getSource().addFeature(route);

  startCoordEl.textContent = startCoord.map(c => c.toFixed(5)).join(', ');
  endCoordEl.textContent = endCoord.map(c => c.toFixed(5)).join(', ');
  distanceEl.textContent = (data.routes[0].distance / 1000).toFixed(2) + ' km';
  durationEl.textContent = Math.round(data.routes[0].duration / 60) + ' min';
  panelEl.classList.add('visible');
}

map.on('click', function (event) {
    console.log(toLonLat(event.coordinate));

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
  console.log(event.key);
  if (event.key === 'Escape') {
    resetMarkers();
  }
});

document.addEventListener('keydown', function (event) {
  console.log(event.key);
  if (event.key === 'r') {
    if (currentSelectedMarker1 !== null && currentSelectedMarker2 !== null && routeLayer.getSource().getFeatures().length === 0) {
      drawRoute(currentSelectedMarker1, currentSelectedMarker2, profileSelect.value);
      console.log("Route drawn");
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