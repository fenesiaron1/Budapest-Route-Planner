import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import { map, markerLayer, routeLayer, geolocLayer, geolocStyle, markerStyle, routeStyle } from './map.js';

export var geolocMarker = null;

// Requests the browser's current position and places a marker for it on the map
export function getGeolocation() {
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

// Rerequests the position if the user changes the geolocation permission
const permission = await navigator.permissions.query({
    name: 'geolocation'
});

permission.onchange = () => getGeolocation();