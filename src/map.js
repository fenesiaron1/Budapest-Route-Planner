import {Map, View} from 'ol';
import { fromLonLat, toLonLat } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { defaults } from 'ol/interaction/defaults.js';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Icon, Style } from 'ol/style';
import Stroke from 'ol/style/Stroke.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import XYZ from 'ol/source/XYZ';

const osmSource = new OSM();
const darkSource = new XYZ({
  url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attributions: '&copy; OpenStreetMap contributors &copy; CARTO'
});
 
export const baseLayer = new TileLayer({
  source: osmSource
});

export function setMapTheme(theme) {
  baseLayer.setSource(theme === 'dark' ? darkSource : osmSource);
}

export const map = new Map({
  target: 'map',
  layers: [
    baseLayer
  ],
  interactions: defaults({
        doubleClickZoom: false
    }),
  view: new View({
    center: fromLonLat([19.040235, 47.497912]),
    zoom: 12
  })
});

export const markerLayer = new VectorLayer({
    source: new VectorSource({
        features: [],
    })
});
markerLayer.setZIndex(20);

export const routeLayer = new VectorLayer({
    source: new VectorSource({
        features: []
    })
});

export const geolocLayer = new VectorLayer({
    source: new VectorSource({
        features: [],
    })
});
geolocLayer.setZIndex(10);

export const savedLayer = new VectorLayer({
    source: new VectorSource({
        features: [],
    })
});
savedLayer.setZIndex(15);

export const stationsLayer = new VectorLayer({
    source: new VectorSource({
        features: [],
    })
});
stationsLayer.setZIndex(12);

export const geolocStyle = new Style({
  image: new Icon({
    src: 'src/geoloc.png',
    anchor: [0.5, 1],
    scale: 0.04
  }),
});

export const markerStyle = new Style({
  image: new Icon({
    src: 'src/marker.png',
    anchor: [0.5, 1],
    scale: 0.03
  }),
});

export const homeStyle = new Style({
  image: new Icon({
    src: 'src/home.png',
    anchor: [0.5, 1],
    scale: 0.1
  }),
});

export const workplaceStyle = new Style({
  image: new Icon({
    src: 'src/workplace.png',
    anchor: [0.5, 1],
    scale: 0.086
  }),
});

export const studyStyle = new Style({
  image: new Icon({
    src: 'src/study.png',
    anchor: [0.5, 1],
    scale: 0.075
  }),
});

export const favoriteStyle = new Style({
  image: new Icon({
    src: 'src/favorite.png',
    anchor: [0.5, 1],
    scale: 0.086
  }),
});

export const stationStyle = new Style({
  image: new Icon({
    src: 'src/station.png',
    anchor: [0.5, 1],
    scale: 0.05
  }),
});

export const routeStyle = new Style({
  stroke: new Stroke({
    color: 'rgb(50, 100, 255)',
    width: 4
  })
});

const trafficStyles = {
  1: new Style({ stroke: new Stroke({ color: 'green', width: 5 }) }),
  2: new Style({ stroke: new Stroke({ color: 'yellow', width: 5 }) }),
  3: new Style({ stroke: new Stroke({ color: 'red', width: 5 }) }),
  4: new Style({ stroke: new Stroke({ color: 'magenta', width: 5 }) }),
};
 
export function getTrafficStyle(magnitudeOfDelay) {
  return trafficStyles[magnitudeOfDelay] || routeStyle;
}

const walkingLegStyle = new Style({
  stroke: new Stroke({ color: '#000000', width: 4, lineDash: [2, 8] })
});
 
export function getTransitLegStyle(leg) {
  if (!leg.routeColor) return walkingLegStyle;
  return new Style({
    stroke: new Stroke({ color: `#${leg.routeColor}`, width: 5 })
  });
}

map.addLayer(markerLayer);
map.addLayer(routeLayer);
map.addLayer(geolocLayer);
map.addLayer(savedLayer);
map.addLayer(stationsLayer);

export function addMarker(coord) {
  const marker = new Feature({
    geometry: new Point(coord),
    zIndex: 2
  });
  marker.setStyle(markerStyle);
  markerLayer.getSource().addFeature(marker);
  return marker;
}

function getStyleForType(type) {
  if (type === 'home') return homeStyle;
  if (type === 'workplace') return workplaceStyle;
  if (type === 'study') return studyStyle;
  if (type === 'favorite') return favoriteStyle;
  return markerStyle;
}

const SAVED_STORAGE_KEY = 'savedLocations';
const THEME_STORAGE_KEY = 'mapTheme';
 
export function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme', e);
  }
}
 
export function loadTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  } catch (e) {
    console.error('Failed to load theme', e);
    return 'light';
  }
}
 
function persistSavedMarkers() {
  const data = {};
  savedLayer.getSource().getFeatures().forEach(feature => {
    data[feature.get('type')] = toLonLat(feature.getGeometry().getCoordinates());
  });
  try {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save locations', e);
  }
}

export function loadSavedMarkers() {
  try {
    const raw = localStorage.getItem(SAVED_STORAGE_KEY);
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([type, lonLat]) => {
      const marker = new Feature({
        geometry: new Point(fromLonLat(lonLat)),
        zIndex: 1
      });
      marker.set('type', type);
      marker.setStyle(getStyleForType(type));
      savedLayer.getSource().addFeature(marker);
    });
  } catch (e) {
    console.error('Failed to load saved locations', e);
  }
}

export function getSavedMarker(type) {
  return savedLayer.getSource().getFeatures().find(f => f.get('type') === type);
}

export function setSavedMarker(type, coord) {
  removeSavedMarker(type);
  const marker = new Feature({
    geometry: new Point(coord),
    zIndex: 1
  });
  marker.set('type', type);
  marker.setStyle(getStyleForType(type));
  savedLayer.getSource().addFeature(marker);
  persistSavedMarkers();
  return marker;
}

export function removeSavedMarker(type) {
  const existing = getSavedMarker(type);
  if (existing) savedLayer.getSource().removeFeature(existing);
  persistSavedMarkers();
}

async function loadStations() {
  try {
    const response = await fetch('src/stations.geojson');
    const geojsonData = await response.json();
    const features = new GeoJSON().readFeatures(geojsonData, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });
    features.forEach(feature => feature.setStyle(stationStyle));
    stationsLayer.getSource().addFeatures(features);
  } catch (e) {
    console.error('Failed to load stations', e);
  }
}
loadStations();
