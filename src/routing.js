import { toLonLat, fromLonLat } from 'ol/proj';
import LineString from 'ol/geom/LineString.js';
import Feature from 'ol/Feature';
import { routeLayer, routeStyle, getTrafficStyle, getTransitLegStyle } from './map.js';
import Polyline from 'ol/format/Polyline.js';

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
      
      if(data.routes[0].distance < 1500) {
        await drawRouteBKK(startCoord, endCoord, "Walking route is recommended due to shorter distance.", 'walking');
      }
      else if (data.routes[0].distance < 10000) {
        await drawRouteBKK(startCoord, endCoord, "Public transit is recommended for medium distances.", 'transit');
      }
      else {
        await drawRouteDriving(startCoord, endCoord, "Driving route is recommended for longer distances.", 'driving');
      }
    }
    else if(profile === 'driving') {
      await drawRouteDriving(startCoord, endCoord, "", profile);
    }
    else {
      await drawRouteBKK(startCoord, endCoord, "", profile);
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

export async function drawRouteBKK(startCoord, endCoord, recommendation, profile) {
  const apiKey = import.meta.env.VITE_BKK_API_KEY;
 
  const fromPlace = `::${startCoord[1]},${startCoord[0]}`;
  const toPlace = `::${endCoord[1]},${endCoord[0]}`;
  const mode = profile === 'transit' ? 'TRANSIT,WALK' : 'WALK';
 
  const url = `https://futar.bkk.hu/api/query/v1/ws/otp/api/where/plan-trip` +
  `?key=${apiKey}&version=4&mode=${mode}&numItineraries=1` +
  `&fromPlace=${encodeURIComponent(fromPlace)}&toPlace=${encodeURIComponent(toPlace)}`;
 
  const response = await fetch(url);
  const responseJson = await response.json();
 
  const entry = responseJson.data && responseJson.data.entry;
  const itineraries = entry && entry.plan && entry.plan.itineraries;
  const itinerary = itineraries[0];
 
  routeLayer.getSource().clear();
  const polylineFormat = new Polyline();
  let totalDistance = 0;
 
  itinerary.legs.forEach(leg => {
    totalDistance += leg.distance || 0;
 
    const geometry = polylineFormat.readGeometry(leg.legGeometry.points, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });
 
    const legFeature = new Feature({ geometry });
    legFeature.setStyle(getTransitLegStyle(leg));
    routeLayer.getSource().addFeature(legFeature);
  });
 
  const normalizedData = {
    routes: [{
      distance: totalDistance,
      duration: itinerary.duration
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