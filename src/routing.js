import { toLonLat, fromLonLat } from 'ol/proj';
import LineString from 'ol/geom/LineString.js';
import Feature from 'ol/Feature';
import { routeLayer, routeStyle } from './map.js';

export const routingEvents = new EventTarget();

export async function drawRoute(startMarker, endMarker, profile = 'walking') {
  const startCoord = toLonLat(startMarker.getGeometry().getCoordinates());
  const endCoord = toLonLat(endMarker.getGeometry().getCoordinates());
  const url = `https://router.project-osrm.org/route/v1/${profile}/` +
  `${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}` +
  `?overview=full&geometries=geojson`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    routeLayer.getSource().clear();
    const route = new Feature({
      geometry: new LineString(data.routes[0].geometry.coordinates.map(coord => fromLonLat(coord)))
    });
    route.setStyle(routeStyle);
    routeLayer.getSource().addFeature(route);

    routingEvents.dispatchEvent(new CustomEvent('routecalculated', {
      detail: {
        startCoord,
        endCoord,
        data
      }
    }));
  } catch (error) {
    alert("Error calculating route");
    routingeEvents.dispatchEvent(new CustomEvent('routecalculationerror'));
  }
}