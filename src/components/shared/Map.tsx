import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { mapboxService } from '../../services/mapbox.service';
import type { Property } from '../../models/property.models';
import { MapPin, Trash2, Loader2 } from 'lucide-react';
import { parseBoundaryFromDescription } from '../../utils/boundary';

interface LocationSelectedData {
  lat: number;
  lng: number;
  address: string;
  village: string;
  district: string;
  state: string;
  pincode: string;
  area?: number;
  boundary?: [number, number][];
}

interface MapProps {
  properties?: Property[];
  mode?: 'view' | 'picker' | 'detail';
  center?: [number, number];
  zoom?: number;
  pickerLat?: number;
  pickerLng?: number;
  initialBoundary?: [number, number][];
  onLocationSelected?: (data: LocationSelectedData) => void;
  className?: string;
}

// ─── Math Helpers ──────────────────────────────────────────────────
const calculateCentroid = (points: [number, number][]): [number, number] => {
  let sumLng = 0;
  let sumLat = 0;
  points.forEach(pt => {
    sumLng += pt[0];
    sumLat += pt[1];
  });
  return [sumLng / points.length, sumLat / points.length];
};

const calculatePolygonArea = (points: [number, number][]): number => {
  if (points.length < 3) return 0;
  const R = 6378137; // Earth radius in meters
  const xCoords = points.map(pt => pt[0] * Math.PI / 180 * R * Math.cos(pt[1] * Math.PI / 180));
  const yCoords = points.map(pt => pt[1] * Math.PI / 180 * R);

  let area = 0;
  const j = xCoords.length - 1;
  for (let i = 0; i < xCoords.length; i++) {
    const prevIndex = i === 0 ? j : i - 1;
    area += (xCoords[prevIndex] + xCoords[i]) * (yCoords[prevIndex] - yCoords[i]);
  }
  const absAreaSqMeters = Math.abs(area / 2);
  return Number((absAreaSqMeters / 4046.86).toFixed(2)); // return acres
};

export const Map: React.FC<MapProps> = ({
  properties = [],
  mode = 'view',
  center = [80.4365, 16.3067],
  zoom = 18.5,
  pickerLat = 16.3067,
  pickerLng = 80.4365,
  initialBoundary = [],
  onLocationSelected,
  className = ''
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSatellite, setIsSatellite] = useState(false);
  const [drawMode, setDrawMode] = useState<'pin' | 'draw'>('pin');
  const [pointCount, setPointCount] = useState(0);

  // Reference lists for markers and points
  const pickerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const boundaryMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const propertyMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const boundaryPointsRef = useRef<[number, number][]>([]);

  // Refs for callbacks/changing props to prevent map re-init
  const onLocationSelectedRef = useRef(onLocationSelected);
  onLocationSelectedRef.current = onLocationSelected;
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  // Draw polygon line and fill layers
  const drawPolygon = useCallback(() => {
    const map = mapRef.current;
    const points = boundaryPointsRef.current;
    if (!map || points.length < 2) return;

    const lineSourceId = 'boundary-line-source';
    const fillSourceId = 'boundary-fill-source';
    const closedCoords = [...points, points[0]];

    const lineGeoJson = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: closedCoords },
        properties: {}
      }]
    };

    const fillGeoJson = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [closedCoords] },
        properties: {}
      }]
    };

    try {
      const lineSource = map.getSource(lineSourceId) as mapboxgl.GeoJSONSource;
      if (lineSource) {
        lineSource.setData(lineGeoJson);
      } else {
        map.addSource(lineSourceId, { type: 'geojson', data: lineGeoJson });
        map.addLayer({
          id: 'boundary-line',
          type: 'line',
          source: lineSourceId,
          paint: { 'line-color': '#10b981', 'line-width': 4 }
        });
      }

      if (points.length >= 3) {
        const fillSource = map.getSource(fillSourceId) as mapboxgl.GeoJSONSource;
        if (fillSource) {
          fillSource.setData(fillGeoJson);
        } else {
          map.addSource(fillSourceId, { type: 'geojson', data: fillGeoJson });
          map.addLayer({
            id: 'boundary-fill',
            type: 'fill',
            source: fillSourceId,
            paint: { 'fill-color': '#10b981', 'fill-opacity': 0.22 }
          }, 'boundary-line');
        }
      } else {
        if (map.getLayer('boundary-fill')) map.removeLayer('boundary-fill');
        if (map.getSource(fillSourceId)) map.removeSource(fillSourceId);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleReverseGeocode = useCallback(async (lng: number, lat: number, currentBoundary: [number, number][]) => {
    try {
      const details = await mapboxService.reverseGeocode(lng, lat);
      const calculatedArea = currentBoundary.length >= 3 ? calculatePolygonArea(currentBoundary) : undefined;
      if (onLocationSelectedRef.current) {
        onLocationSelectedRef.current({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          address: details.address || '',
          village: details.village || '',
          district: details.district || '',
          state: details.state || '',
          pincode: details.pincode || '',
          area: calculatedArea,
          boundary: currentBoundary.length > 0 ? [...currentBoundary] : undefined
        });
      }
    } catch {
      if (onLocationSelectedRef.current) {
        onLocationSelectedRef.current({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          address: '', village: '', district: '', state: '', pincode: '',
          boundary: currentBoundary.length > 0 ? [...currentBoundary] : undefined
        });
      }
    }
  }, []);

  const addBoundaryMarker = useCallback((lng: number, lat: number, index: number) => {
    const map = mapRef.current;
    if (!map) return;

    const el = document.createElement('div');
    el.className = 'w-3.5 h-3.5 bg-accent-500 border-2 border-white rounded-full shadow-lg cursor-pointer';
    el.addEventListener('click', (e) => e.stopPropagation());

    const marker = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(map);

    marker.on('drag', () => {
      const pos = marker.getLngLat();
      boundaryPointsRef.current[index] = [pos.lng, pos.lat];
      drawPolygon();
    });

    marker.on('dragend', () => {
      const centroid = calculateCentroid(boundaryPointsRef.current);
      handleReverseGeocode(centroid[0], centroid[1], boundaryPointsRef.current);
    });

    boundaryMarkersRef.current.push(marker);
    setPointCount(boundaryPointsRef.current.length);
  }, [drawPolygon, handleReverseGeocode]);

  const clearBoundary = useCallback((emitEvent = false) => {
    boundaryPointsRef.current = [];
    setPointCount(0);
    boundaryMarkersRef.current.forEach(m => m.remove());
    boundaryMarkersRef.current = [];

    const map = mapRef.current;
    if (map) {
      if (map.getLayer('boundary-fill')) map.removeLayer('boundary-fill');
      if (map.getSource('boundary-fill-source')) map.removeSource('boundary-fill-source');
      if (map.getLayer('boundary-line')) map.removeLayer('boundary-line');
      if (map.getSource('boundary-line-source')) map.removeSource('boundary-line-source');
    }

    if (emitEvent) {
      const lat = pickerMarkerRef.current ? pickerMarkerRef.current.getLngLat().lat : pickerLat;
      const lng = pickerMarkerRef.current ? pickerMarkerRef.current.getLngLat().lng : pickerLng;
      handleReverseGeocode(lng, lat, []);
    }
  }, [pickerLat, pickerLng, handleReverseGeocode]);

  // Load boundary points on mount/update
  const loadBoundary = useCallback((boundary: [number, number][]) => {
    clearBoundary();
    if (!boundary || boundary.length === 0) return;

    boundaryPointsRef.current = [...boundary];
    setPointCount(boundary.length);
    boundary.forEach((pt, idx) => addBoundaryMarker(pt[0], pt[1], idx));

    const map = mapRef.current;
    if (map) {
      const cent = calculateCentroid(boundary);
      map.setCenter(cent);
      if (pickerMarkerRef.current) pickerMarkerRef.current.setLngLat(cent);
      drawPolygon();
    }
  }, [clearBoundary, addBoundaryMarker, drawPolygon]);

  // Initial mount - run exactly ONCE
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = mapboxService.initializeMap(mapContainer.current, center, zoom);
    mapRef.current = map;

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    });
    map.addControl(geolocate, 'bottom-right');

    map.on('style.load', () => {
      setLoading(false);
      map.resize();

      if (mode === 'view') {
        setTimeout(() => {
          geolocate.trigger();
        }, 1200);
      }

      // Setup picker marker
      if (mode === 'picker') {
        pickerMarkerRef.current = new mapboxgl.Marker({ color: '#10b981', draggable: true })
          .setLngLat([pickerLng, pickerLat])
          .addTo(map);

        pickerMarkerRef.current.on('dragend', () => {
          const pos = pickerMarkerRef.current!.getLngLat();
          handleReverseGeocode(pos.lng, pos.lat, boundaryPointsRef.current);
        });

        // Initialize boundary if present
        if (initialBoundary && initialBoundary.length > 0) {
          loadBoundary(initialBoundary);
        } else {
          handleReverseGeocode(pickerLng, pickerLat, []);
        }
      } else if (mode === 'detail' && properties.length > 0) {
        const p = properties[0];
        mapboxService.addPropertyMarker(map, p);

        // Check if there is boundary drawn in the description
        const parsed = parseBoundaryFromDescription(p.description || '');

        if (parsed && parsed.length > 0) {
          boundaryPointsRef.current = parsed;
          parsed.forEach((pt) => {
            const el = document.createElement('div');
            el.className = 'w-2 h-2 bg-accent-500 rounded-full border border-white';
            new mapboxgl.Marker({ element: el }).setLngLat(pt).addTo(map);
          });
          drawPolygon();

          // Auto fit map bounds to show ALL boundary points with generous padding
          const bounds = new mapboxgl.LngLatBounds();
          parsed.forEach(pt => bounds.extend(pt));
          map.fitBounds(bounds, { padding: 140, maxZoom: 15, duration: 1000 });
        } else {
          // Draw fallback hexagon circle
          const areaSqMeters = (p.area || 1) * 4046.86;
          const r = Math.sqrt(areaSqMeters / Math.PI);
          const pts: [number, number][] = [];
          const R = 6378137;
          for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            const dLat = (r * Math.sin(angle)) / R * 180 / Math.PI;
            const dLng = (r * Math.cos(angle)) / (R * Math.cos(p.latitude * Math.PI / 180)) * 180 / Math.PI;
            pts.push([p.longitude + dLng, p.latitude + dLat]);
          }
          pts.push(pts[0]);
          map.addSource('fallback-boundary', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] }, properties: {} }
          });
          map.addLayer({
            id: 'fallback-fill', type: 'fill', source: 'fallback-boundary', paint: { 'fill-color': '#10b981', 'fill-opacity': 0.15 }
          });
          map.addLayer({
            id: 'fallback-line', type: 'line', source: 'fallback-boundary', paint: { 'line-color': '#10b981', 'line-width': 2, 'line-dasharray': [2, 2] }
          });
          // Fit bounds to fallback hexagon too
          const fbBounds = new mapboxgl.LngLatBounds();
          pts.forEach(pt => fbBounds.extend(pt));
          map.fitBounds(fbBounds, { padding: 140, maxZoom: 15, duration: 1000 });
        }
      } else if (mode === 'view') {
        propertyMarkersRef.current.forEach(m => m.remove());
        propertyMarkersRef.current = properties.map(p => mapboxService.addPropertyMarker(map, p));

        const features = properties.map(p => {
          const parsed = parseBoundaryFromDescription(p.description || '');
          if (parsed && parsed.length > 2) {
            const closedCoords = [...parsed, parsed[0]];
            return {
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: [closedCoords] },
              properties: { id: p.id, category: p.category }
            };
          }
          return null;
        }).filter(Boolean) as any[];

        if (features.length > 0) {
          if (map.getSource('view-polygons')) {
            (map.getSource('view-polygons') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
          } else {
            map.addSource('view-polygons', { type: 'geojson', data: { type: 'FeatureCollection', features } });
            map.addLayer({
              id: 'view-polygons-fill', type: 'fill', source: 'view-polygons',
              paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.15 }
            });
            map.addLayer({
              id: 'view-polygons-line', type: 'line', source: 'view-polygons',
              paint: { 'line-color': '#3b82f6', 'line-width': 2 }
            });
          }
          // Fit bounds to show all properties if any exist
          const bounds = new mapboxgl.LngLatBounds();
          features.forEach(f => {
            f.geometry.coordinates[0].forEach((coord: [number, number]) => bounds.extend(coord));
          });
          map.fitBounds(bounds, { padding: 40, duration: 1000 });
        }
      }
    });

    map.on('click', (e: any) => {
      if (mode !== 'picker') return;

      if (drawModeRef.current === 'pin') {
        if (pickerMarkerRef.current) {
          pickerMarkerRef.current.setLngLat(e.lngLat);
          handleReverseGeocode(e.lngLat.lng, e.lngLat.lat, boundaryPointsRef.current);
        }
      } else {
        const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        boundaryPointsRef.current = [...boundaryPointsRef.current, pt];
        addBoundaryMarker(pt[0], pt[1], boundaryPointsRef.current.length - 1);
        drawPolygon();

        const cent = calculateCentroid(boundaryPointsRef.current);
        handleReverseGeocode(cent[0], cent[1], boundaryPointsRef.current);
      }
    });

    return () => {
      if (pickerMarkerRef.current) pickerMarkerRef.current.remove();
      boundaryMarkersRef.current.forEach(m => m.remove());
      propertyMarkersRef.current.forEach(m => m.remove());
      map.remove();
    };
  }, []); // Run exactly once!

  // Watch properties updates (only in view mode, no re-initialization)
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded() && mode === 'view') {
      propertyMarkersRef.current.forEach(m => m.remove());
      propertyMarkersRef.current = properties.map(p => mapboxService.addPropertyMarker(map, p));

      const features = properties.map(p => {
        const parsed = parseBoundaryFromDescription(p.description || '');
        if (parsed && parsed.length > 2) {
          const closedCoords = [...parsed, parsed[0]];
          return {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [closedCoords] },
            properties: { id: p.id, category: p.category }
          };
        }
        return null;
      }).filter(Boolean) as any[];

      if (features.length > 0) {
        if (map.getSource('view-polygons')) {
          (map.getSource('view-polygons') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
        } else {
          map.addSource('view-polygons', { type: 'geojson', data: { type: 'FeatureCollection', features } });
          map.addLayer({
            id: 'view-polygons-fill', type: 'fill', source: 'view-polygons',
            paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.15 }
          });
          map.addLayer({
            id: 'view-polygons-line', type: 'line', source: 'view-polygons',
            paint: { 'line-color': '#3b82f6', 'line-width': 2 }
          });
        }
      } else {
        if (map.getSource('view-polygons')) {
          (map.getSource('view-polygons') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
        }
      }
    }
  }, [properties, mode]);

  // Handle switching drawMode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (drawMode === 'pin') {
      if (pickerMarkerRef.current) pickerMarkerRef.current.addTo(map);
      boundaryMarkersRef.current.forEach(m => m.remove());
    } else {
      if (pickerMarkerRef.current) pickerMarkerRef.current.remove();
      boundaryMarkersRef.current.forEach(m => m.addTo(map));
    }
  }, [drawMode]);

  const toggleStyle = () => {
    const map = mapRef.current;
    if (!map) return;
    const nextStyle = isSatellite ? 'mapbox://styles/mapbox/streets-v12' : 'mapbox://styles/mapbox/satellite-streets-v12';
    map.setStyle(nextStyle);
    setIsSatellite(!isSatellite);
  };

  return (
    <div className={`relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden border border-white/10 shadow-lg ${className}`}>
      <div ref={mapContainer} className="w-full h-full absolute inset-0"></div>

      {loading && (
        <div className="absolute inset-0 bg-dark-950/60 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="glass-card px-5 py-3 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
            <span className="text-white text-sm font-medium">Loading map layers...</span>
          </div>
        </div>
      )}

      {mode === 'picker' && !loading && (
        <div className="absolute top-4 left-4 z-40 glass-card !bg-dark-950/85 backdrop-blur-md border-white/10 p-3 flex flex-col gap-2 max-w-[200px] shadow-2xl">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Boundary Drawing Tool</span>
          <div className="flex bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setDrawMode('pin')}
              className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all text-center flex items-center justify-center gap-1
                ${drawMode === 'pin' ? 'bg-white/10 text-white shadow-xs' : 'text-dark-500 hover:text-dark-300'}`}
            >
              <MapPin className="w-2.5 h-2.5" /> Pin Point
            </button>
            <button
              type="button"
              onClick={() => setDrawMode('draw')}
              className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all text-center flex items-center justify-center gap-1
                ${drawMode === 'draw' ? 'bg-white/10 text-white shadow-xs' : 'text-dark-500 hover:text-dark-300'}`}
            >
              Draw Area
            </button>
          </div>

          {drawMode === 'draw' && (
            <div className="space-y-2 pt-1 border-t border-white/[0.06] text-left">
              <p className="text-[9px] text-dark-400 leading-tight">
                Click map to add boundary points. Drag points to adjust.
              </p>
              {pointCount > 0 && (
                <div className="flex justify-between items-center text-[9px] text-accent-400 font-semibold">
                  <span>Points Placed:</span>
                  <span>{pointCount}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => clearBoundary(true)}
                className="w-full py-1.5 bg-danger-500/10 hover:bg-danger-500/20 text-danger-400 font-bold text-[9px] rounded-lg transition border border-danger-500/20 flex items-center justify-center gap-1"
              >
                <Trash2 className="w-2.5 h-2.5" /> Clear Points
              </button>
            </div>
          )}
        </div>
      )}

      <button 
        onClick={toggleStyle}
        className="absolute bottom-4 left-4 glass-card !bg-dark-950/85 hover:!bg-white/[0.08] text-white font-semibold text-xs px-3 py-2 rounded-xl shadow-md border border-white/10 transition z-40 flex items-center gap-1.5 backdrop-blur-xs"
      >
        <span className={`w-2 h-2 rounded-full ${isSatellite ? 'bg-cyan-400' : 'bg-accent-400 animate-pulse'}`}></span>
        {isSatellite ? 'Street View' : 'Satellite View'}
      </button>
    </div>
  );
};
