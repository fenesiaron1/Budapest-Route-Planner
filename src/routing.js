import { toLonLat, fromLonLat } from 'ol/proj';
import LineString from 'ol/geom/LineString.js';
import Feature from 'ol/Feature';
import { routeLayer, routeStyle } from './map.js';

export const routingEvents = new EventTarget();

export async function drawRoute(startMarker, endMarker, profile = 'default') {
  const startCoord = toLonLat(startMarker.getGeometry().getCoordinates());
  const endCoord = toLonLat(endMarker.getGeometry().getCoordinates());
  
  try {
    if(profile === 'default') {
      const url = `https://router.project-osrm.org/route/v1/walking/` +
      `${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}` +
      `?overview=full&geometries=geojson`;

      const response = await fetch(url);
      const data = await response.json();
      
      if(data.routes[0].distance < 1000) {
        drawRouteWalking(startCoord, endCoord, "Walking route is recommended due to shorter distance.");
      }
      else {
        drawRouteDriving(startCoord, endCoord, "Driving route is recommended for longer distances.");
      }
    }
    else if(profile === 'walking' || profile === 'cycling') {
      drawRouteWalking(startCoord, endCoord, "");
    }
    else if(profile === 'driving') {
      drawRouteDriving(startCoord, endCoord, "");
    }

  } catch (error) {
    alert("Error calculating route");
    routingEvents.dispatchEvent(new CustomEvent('routecalculationerror'));
  }
}

export async function drawRouteWalking(startCoord, endCoord, recommendation) {
  const url = `https://router.project-osrm.org/route/v1/walking/` +
  `${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}` +
  `?overview=full&geometries=geojson`;

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
        data,
        recommendation
      }
    }));
}

/*
export async function drawRouteDriving(startCoord, endCoord, recommendation) {
  const url = `https://router.project-osrm.org/route/v1/driving/` +
  `${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}` +
  `?overview=full&geometries=geojson`;

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
        data,
        recommendation
      }
    }));
}
    */

export async function drawRouteDriving(startCoord, endCoord, recommendation) {
  const apiKey = import.meta.env.VITE_TOMTOM_API_KEY;
 
  const url = `https://api.tomtom.com/routing/1/calculateRoute/` +
  `${startCoord[1]},${startCoord[0]}:${endCoord[1]},${endCoord[0]}/json` +
  `?key=${apiKey}&traffic=true`;
 
  const response = await fetch(url);
  const data = await response.json();
 
  const routeCoords = data.routes[0].legs[0].points
    .map(point => fromLonLat([point.longitude, point.latitude]));
 
  routeLayer.getSource().clear();
  const route = new Feature({
    geometry: new LineString(routeCoords)
  });
  route.setStyle(routeStyle);
  routeLayer.getSource().addFeature(route);
 
  const normalizedData = {
    routes: [{
      distance: data.routes[0].summary.lengthInMeters,
      duration: data.routes[0].summary.travelTimeInSeconds
    }]
  };
 
  routingEvents.dispatchEvent(new CustomEvent('routecalculated', {
    detail: {
      startCoord,
      endCoord,
      data: normalizedData,
      recommendation
    }
  }));
}