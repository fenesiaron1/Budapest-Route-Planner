import './style.css';
import {Map, View} from 'ol';
import { fromLonLat } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

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
  view: new View({
    center: fromLonLat([19.040235, 47.497912]),
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

map.addLayer(markerLayer);
map.addLayer(routeLayer);





