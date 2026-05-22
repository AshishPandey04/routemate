'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from '@react-google-maps/api'
import { decodePolyline } from '@/lib/polyline.js'

const MAP_CONTAINER = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
}

const MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8b9cb3' }] },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#2d3548' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#3d4a63' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#0e1219' }],
    },
  ],
}

function driverMarkerIcon(heading) {
  if (typeof window === 'undefined' || !window.google?.maps) return undefined
  return {
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 5,
    fillColor: '#22c55e',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 1.5,
    rotation: heading ?? 0,
  }
}

/**
 * Live trip map: planned route polyline, stops, and driver position.
 */
export default function TripMap({ trip, liveLocation, height = 420 }) {
  const mapRef = useRef(null)
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
    ''

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'routemate-google-maps',
    googleMapsApiKey: apiKey,
  })

  const routePath = useMemo(
    () => (trip?.encodedPolyline ? decodePolyline(trip.encodedPolyline) : []),
    [trip?.encodedPolyline]
  )

  const origin = useMemo(
    () =>
      trip
        ? { lat: trip.originLat, lng: trip.originLng }
        : null,
    [trip?.originLat, trip?.originLng]
  )

  const destination = useMemo(
    () =>
      trip
        ? { lat: trip.destinationLat, lng: trip.destinationLng }
        : null,
    [trip?.destinationLat, trip?.destinationLng]
  )

  const stopMarkers = useMemo(() => {
    if (!trip?.waypoints?.length) return []
    return trip.waypoints.filter(
      (wp) => wp.lat && wp.lng && Math.abs(wp.lat) > 0.001
    )
  }, [trip?.waypoints])

  const defaultCenter = useMemo(() => {
    if (liveLocation?.lat != null) {
      return { lat: liveLocation.lat, lng: liveLocation.lng }
    }
    if (origin) return origin
    return { lat: 20.5937, lng: 78.9629 }
  }, [liveLocation, origin])

  const fitMapToRoute = useCallback(() => {
    const map = mapRef.current
    if (!map || typeof window === 'undefined' || !window.google?.maps) return

    const bounds = new window.google.maps.LatLngBounds()
    let hasPoint = false

    for (const p of routePath) {
      bounds.extend(p)
      hasPoint = true
    }
    if (origin) {
      bounds.extend(origin)
      hasPoint = true
    }
    if (destination) {
      bounds.extend(destination)
      hasPoint = true
    }
    for (const wp of stopMarkers) {
      bounds.extend({ lat: wp.lat, lng: wp.lng })
      hasPoint = true
    }
    if (liveLocation?.lat != null) {
      bounds.extend({ lat: liveLocation.lat, lng: liveLocation.lng })
      hasPoint = true
    }

    if (hasPoint) {
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 })
    }
  }, [routePath, origin, destination, stopMarkers, liveLocation])

  useEffect(() => {
    if (isLoaded && trip) fitMapToRoute()
  }, [isLoaded, trip, liveLocation?.lat, liveLocation?.lng, fitMapToRoute])

  if (!apiKey) {
    return (
      <MapPlaceholder
        height={height}
        message="Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the live map."
      />
    )
  }

  if (loadError) {
    return (
      <MapPlaceholder
        height={height}
        message="Could not load Google Maps. Check your API key and billing."
      />
    )
  }

  if (!isLoaded) {
    return (
      <MapPlaceholder height={height} message="Loading map…" loading />
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-input)',
      }}
    >
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER}
        center={defaultCenter}
        zoom={8}
        options={MAP_OPTIONS}
        onLoad={(map) => {
          mapRef.current = map
          fitMapToRoute()
        }}
      >
        {routePath.length > 1 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0.85,
              strokeWeight: 5,
              geodesic: true,
            }}
          />
        )}

        {origin && (
          <Marker
            position={origin}
            title={trip?.originCity || 'Origin'}
            label={{ text: 'A', color: '#000', fontWeight: '700' }}
          />
        )}

        {destination && (
          <Marker
            position={destination}
            title={trip?.destinationCity || 'Destination'}
            label={{ text: 'B', color: '#000', fontWeight: '700' }}
          />
        )}

        {stopMarkers.map((wp) => (
          <Marker
            key={wp.id || wp.cityName}
            position={{ lat: wp.lat, lng: wp.lng }}
            title={wp.cityName}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#f59e0b',
              fillOpacity: 1,
              strokeColor: '#000',
              strokeWeight: 1,
            }}
          />
        ))}

        {liveLocation?.lat != null && liveLocation?.lng != null && (
          <Marker
            position={{ lat: liveLocation.lat, lng: liveLocation.lng }}
            title="Driver"
            icon={driverMarkerIcon(liveLocation.heading)}
            zIndex={1000}
          />
        )}
      </GoogleMap>
    </div>
  )
}

function MapPlaceholder({ height, message, loading }) {
  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: '12px',
        border: '1px dashed var(--border)',
        background: 'var(--bg-input)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--muted)',
        fontSize: '14px',
        lineHeight: 1.5,
      }}
    >
      {loading ? (
        <span style={{ animation: 'pulse 1.5s infinite' }}>{message}</span>
      ) : (
        message
      )}
    </div>
  )
}
