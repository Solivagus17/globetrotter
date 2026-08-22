import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { geocodeCity } from '../osmService'

export default function TripMap({
  stops = [],
  selectedStopId = null,
  onSelectStop = null,
  height = '360px',
  interactive = true,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const polylineRef = useRef(null)
  const [stopCoords, setStopCoords] = useState([])
  const [loadingCoords, setLoadingCoords] = useState(true)

  // Geocode all stops that don't have coords
  useEffect(() => {
    let active = true
    if (stops.length === 0) {
      setStopCoords([])
      setLoadingCoords(false)
      return
    }

    async function resolveCoords() {
      setLoadingCoords(true)
      const resolved = []
      for (const stop of stops) {
        let lat = stop.lat
        let lon = stop.lon
        if (!lat || !lon) {
          const res = await geocodeCity(stop.city_name, stop.country)
          if (res) {
            lat = res.lat
            lon = res.lon
          }
        }
        if (lat && lon) {
          resolved.push({
            ...stop,
            lat,
            lon,
          })
        }
      }
      if (active) {
        setStopCoords(resolved)
        setLoadingCoords(false)
      }
    }

    resolveCoords()
    return () => {
      active = false
    }
  }, [stops])

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const initialLat = stopCoords.length > 0 ? stopCoords[0].lat : 25
    const initialLon = stopCoords.length > 0 ? stopCoords[0].lon : 15
    const initialZoom = stopCoords.length > 0 ? 5 : 2

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: interactive,
      scrollWheelZoom: interactive ? 'center' : false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map)

    L.control
      .attribution({
        prefix: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        position: 'bottomright',
      })
      .addTo(map)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [interactive])

  // Update Markers & Polylines when stopCoords changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    if (polylineRef.current) {
      polylineRef.current.remove()
      polylineRef.current = null
    }

    if (stopCoords.length === 0) return

    const latLngs = []

    stopCoords.forEach((stop, index) => {
      const pos = [stop.lat, stop.lon]
      latLngs.push(pos)

      const isSelected = selectedStopId === stop.id
      const stopNumber = index + 1

      const iconHtml = `
        <div class="custom-osm-pin ${isSelected ? 'selected' : ''}">
          <div class="osm-pin-circle">${stopNumber}</div>
          <div class="osm-pin-pulse"></div>
        </div>
      `

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-osm-marker-container',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      })

      const marker = L.marker(pos, { icon: customIcon }).addTo(map)

      const activities = stop.activities || []
      const foodCount = activities.filter(a => (a.category || '').includes('food')).length
      const todoCount = activities.filter(a => (a.category || '') === 'things_to_do' || (a.category || '') === 'adventure' || (a.category || '') === 'custom').length
      const visitCount = activities.filter(a => (a.category || '') === 'places_to_visit' || (a.category || '') === 'sightseeing' || (a.category || '') === 'culture').length

      const popupContent = `
        <div class="osm-popup-card">
          <div class="osm-popup-header">
            <span class="osm-popup-step">Stop ${stopNumber}</span>
            <h4 class="osm-popup-title">${stop.city_name}</h4>
            <span class="osm-popup-country">${stop.country || ''}</span>
          </div>
          <div class="osm-popup-stats">
            <span>Food: ${foodCount}</span>
            <span>Activities: ${todoCount}</span>
            <span>Sights: ${visitCount}</span>
          </div>
          ${stop.start_date ? `<div class="osm-popup-dates">${stop.start_date} ${stop.end_date ? '→ ' + stop.end_date : ''}</div>` : ''}
        </div>
      `

      marker.bindPopup(popupContent, {
        className: 'custom-osm-popup',
        closeButton: true,
      })

      marker.on('click', () => {
        if (onSelectStop) onSelectStop(stop)
      })

      markersRef.current.push(marker)
    })

    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: '#E0A11C',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)
      polylineRef.current = polyline
    }

    if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs), {
        padding: [45, 45],
        maxZoom: 12,
        animate: true,
      })
    } else if (latLngs.length === 1) {
      map.setView(latLngs[0], 9, { animate: true })
    }
  }, [stopCoords, selectedStopId])

  // Center on selected stop if changed
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !selectedStopId) return
    const target = stopCoords.find(s => s.id === selectedStopId)
    if (target) {
      map.setView([target.lat, target.lon], 11, { animate: true, duration: 0.8 })
    }
  }, [selectedStopId, stopCoords])

  return (
    <div className="trip-map-wrapper" style={{ height }}>
      <div ref={mapContainerRef} className="trip-osm-map" style={{ height: '100%', width: '100%' }} />
      {loadingCoords && (
        <div className="map-loading-badge">
          <span>Locating stops on OpenStreetMap...</span>
        </div>
      )}
      {stopCoords.length > 0 && (
        <div className="map-stops-counter">
          <span>{stopCoords.length} {stopCoords.length === 1 ? 'Stop' : 'Stops'} Mapped</span>
        </div>
      )}
    </div>
  )
}
