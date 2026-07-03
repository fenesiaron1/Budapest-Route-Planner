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

export const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    })
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
    
export const routeStyle = new Style({
  stroke: new Stroke({
    color: 'red',
    width: 4
  })
});

map.addLayer(markerLayer);
map.addLayer(routeLayer);
map.addLayer(geolocLayer);

export function addMarker(coord) {
  const marker = new Feature({
    geometry: new Point(coord),
    zIndex: 2
  });
  marker.setStyle(markerStyle);
  markerLayer.getSource().addFeature(marker);
  return marker;
}