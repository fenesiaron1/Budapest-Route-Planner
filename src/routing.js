import { toLonLat, fromLonLat } from 'ol/proj';
import LineString from 'ol/geom/LineString.js';
import Feature from 'ol/Feature';
import { routeLayer, routeStyle, getTrafficStyle } from './map.js';

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
        drawRouteWalking(startCoord, endCoord, "Walking route is recommended due to shorter distance.", 'walking');
      }
      else {
        drawRouteDriving(startCoord, endCoord, "Driving route is recommended for longer distances.", 'driving');
      }
    }
    else if(profile === 'walking' || profile === 'cycling') {
      drawRouteWalking(startCoord, endCoord, "", profile);
    }
    else if(profile === 'driving') {
      drawRouteDriving(startCoord, endCoord, "", profile);
    }

  } catch (error) {
    alert("Error calculating route");
    routingEvents.dispatchEvent(new CustomEvent('routecalculationerror'));
  }
}

export async function drawRouteWalking(startCoord, endCoord, recommendation, profile) {
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
        recommendation,
        profile
      }
    }));
}

export async function drawRouteDriving(startCoord, endCoord, recommendation, profile) {
  const apiKey = import.meta.env.VITE_TOMTOM_API_KEY;
 
  const url = `https://api.tomtom.com/routing/1/calculateRoute/` +
  `${startCoord[1]},${startCoord[0]}:${endCoord[1]},${endCoord[0]}/json` +
  `?key=${apiKey}&traffic=true&sectionType=traffic`;
 
  const response = await fetch(url);
  const data = await response.json();
  const route = data.routes[0];
 
  const routeCoords = route.legs[0].points
    .map(point => fromLonLat([point.longitude, point.latitude]));
 
  routeLayer.getSource().clear();
 
  const baseFeature = new Feature({
    geometry: new LineString(routeCoords)
  });
  baseFeature.setStyle(routeStyle);
  routeLayer.getSource().addFeature(baseFeature);
 
  const trafficSections = (route.sections || [])
    .filter(section => section.sectionType === 'TRAFFIC');
 
  trafficSections.forEach(section => {
    const segmentCoords = routeCoords.slice(section.startPointIndex, section.endPointIndex + 1);
    if (segmentCoords.length < 2) return;
 
    const segmentFeature = new Feature({
      geometry: new LineString(segmentCoords)
    });
    segmentFeature.setStyle(getTrafficStyle(section.magnitudeOfDelay));
    routeLayer.getSource().addFeature(segmentFeature);
  });
 
  const normalizedData = {
    routes: [{
      distance: route.summary.lengthInMeters,
      duration: route.summary.travelTimeInSeconds
    }]
  };
 
  routingEvents.dispatchEvent(new CustomEvent('routecalculated', {
    detail: {
      startCoord,
      endCoord,
      data: normalizedData,
      recommendation,
      profile
    }
  }));
}