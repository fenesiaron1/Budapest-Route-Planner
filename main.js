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

const BudapestCenter = fromLonLat([19.040235, 47.497912]);

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
    center: BudapestCenter,
    zoom: 12
  })
});

const markerLayer = new VectorLayer({
    source: new VectorSource({
        features: []
    })
});

const routeLayer = new VectorLayer({
    source: new VectorSource({
        features: []
    })
});

const markerStyle = new Style({
  image: new Icon({
    src: 'marker.png',
    anchor: [0.5, 1],
    scale: 0.03
  })
});
    
const routeStyle = new Style({
  stroke: new Stroke({
    color: 'red',
    width: 4
  })
});

map.addLayer(markerLayer);
map.addLayer(routeLayer);

var currentSelectedMarker1 = null;
var currentSelectedMarker2 = null;

function resetMarkers() {
  markerLayer.getSource().clear();
  currentSelectedMarker1 = null;
  currentSelectedMarker2 = null;
  routeLayer.getSource().clear();
}

function addMarker(event) {
  const marker = new Feature({
    geometry: new Point(event.coordinate)
  });
  marker.setStyle(markerStyle);
  markerLayer.getSource().addFeature(marker);
  return marker;
}

async function drawRoute(startMarker, endMarker) {
  const startCoord = toLonLat(startMarker.getGeometry().getCoordinates());
  const endCoord = toLonLat(endMarker.getGeometry().getCoordinates());

  const url = `https://router.project-osrm.org/route/v1/foot/` +
  `${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}` +
  `?overview=full&geometries=geojson`;
  
  try
  {
    const response = await fetch(url);
    const data = await response.json();

    console.log(data);
    
    const route = new Feature({
      geometry: new LineString(data.routes[0].geometry.coordinates.map(coord => fromLonLat(coord)))
    });
    route.setStyle(routeStyle);
    routeLayer.getSource().addFeature(route);
  }
  catch (error) {
    console.error('Error drawing route:', error);
  }
}

map.on('click', function (event) {

    console.log(toLonLat(event.coordinate));
    if(currentSelectedMarker1 === null) currentSelectedMarker1 = addMarker(event);
    else if(currentSelectedMarker2 === null) currentSelectedMarker2 = addMarker(event);
    else resetMarkers();

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
      drawRoute(currentSelectedMarker1, currentSelectedMarker2);
      console.log("Route drawn");
    }
  }
});






