import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, AfterViewInit, OnChanges, SimpleChanges, OnDestroy, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapboxService } from '../../../core/services/mapbox.service';
import { Property } from '../../../core/models/property.models';
import mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      <div #mapContainer class="w-full h-full absolute inset-0"></div>
      
      <!-- SVG Overlay for drawing closed boundary lines between dots -->
      <svg 
        *ngIf="!!map && (mode === 'detail' || (mode === 'picker' && drawMode === 'draw')) && boundaryPoints.length >= 2"
        width="100%"
        height="100%"
        style="display: block; position: absolute; top: 0; left: 0; pointer-events: none; z-index: 30;">
        <polygon 
          [attr.points]="svgPoints" 
          fill="rgba(16, 185, 129, 0.22)" 
          stroke="#10b981" 
          stroke-width="4" 
          stroke-linejoin="round"
        />
      </svg>

      <!-- Loading Overlay -->
      <div *ngIf="loading" class="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50">
        <div class="bg-white/95 px-6 py-4 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3">
          <div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-slate-700 font-medium text-sm">Loading map layers...</span>
        </div>
      </div>

      <!-- Drawing Controls (Picker Mode Only) -->
      <div *ngIf="mode === 'picker' && !!map" class="absolute top-4 left-4 z-40 bg-white/95 px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-200/50 flex flex-col gap-2 backdrop-blur-xs max-w-[180px]">
        <span class="text-[11px] font-bold text-slate-800 tracking-tight">Land Boundary Tool</span>
        <div class="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/30">
          <button 
            type="button"
            (click)="setDrawMode('pin')"
            [class.bg-white]="drawMode === 'pin'"
            [class.shadow-xs]="drawMode === 'pin'"
            [class.text-slate-800]="drawMode === 'pin'"
            [class.text-slate-500]="drawMode !== 'pin'"
            class="flex-1 py-1 text-[9px] font-bold rounded-md transition-all text-center">
            Pin Point
          </button>
          <button 
            type="button"
            (click)="setDrawMode('draw')"
            [class.bg-white]="drawMode === 'draw'"
            [class.shadow-xs]="drawMode === 'draw'"
            [class.text-slate-800]="drawMode === 'draw'"
            [class.text-slate-500]="drawMode !== 'draw'"
            class="flex-1 py-1 text-[9px] font-bold rounded-md transition-all text-center">
            Draw Area
          </button>
        </div>
        <div *ngIf="drawMode === 'draw'" class="space-y-1.5 pt-1.5 border-t border-slate-100">
          <p class="text-[9px] text-slate-500 leading-tight">Click map to add boundary dots. Drag dots to adjust.</p>
          <button 
            type="button"
            (click)="clearBoundary()"
            class="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[9px] rounded-lg transition border border-rose-200/20">
            Clear Dots
          </button>
        </div>
      </div>

      <!-- Sat/Street View Toggle -->
      <button 
        *ngIf="map"
        (click)="toggleMapStyle()"
        class="absolute bottom-4 left-4 bg-white/90 hover:bg-white text-slate-800 font-semibold text-xs px-3 py-2 rounded-lg shadow-md border border-slate-200 transition z-40 flex items-center gap-1.5 backdrop-blur-xs">
        <span class="w-2.5 h-2.5 rounded-full" [ngClass]="isSatellite ? 'bg-blue-500' : 'bg-emerald-600'"></span>
        {{ isSatellite ? 'Switch to Street View' : 'Switch to Satellite View' }}
      </button>
    </div>
  `
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() properties: Property[] = [];
  @Input() mode: 'view' | 'picker' | 'detail' = 'view';
  @Input() center: [number, number] = [80.4365, 16.3067]; // default Guntur/AP
  @Input() zoom = 10;
  @Input() pickerLat = 16.3067;
  @Input() pickerLng = 80.4365;
  @Input() initialBoundary: [number, number][] = [];

  @Output() locationSelected = new EventEmitter<{
    lat: number;
    lng: number;
    address: string;
    village: string;
    district: string;
    state: string;
    pincode: string;
    area?: number;
    boundary?: [number, number][];
  }>();

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  map: mapboxgl.Map | any = null;
  isSatellite = false;
  loading = true;
  styleLoaded = false;
  drawMode: 'pin' | 'draw' = 'pin';
  boundaryPoints: [number, number][] = [];
  private boundaryMarkers: mapboxgl.Marker[] = [];
  private markers: mapboxgl.Marker[] = [];
  private pickerMarker: mapboxgl.Marker | null = null;
  private mapboxService = inject(MapboxService);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    this.initMap();
    // Safety resize to handle dynamic tab layout rendering transitions
    setTimeout(() => {
      if (this.map) {
        this.map.resize();
      }
    }, 500);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['properties'] && !changes['properties'].firstChange && this.map) {
      this.updateMarkers();
    }
    if (changes['initialBoundary'] && this.map) {
      this.loadInitialBoundaryPoints(changes['initialBoundary'].currentValue);
    }
  }

  private loadInitialBoundaryPoints(boundary: [number, number][]): void {
    this.clearBoundary();
    if (!boundary || boundary.length === 0) return;

    this.boundaryPoints = [...boundary];
    this.boundaryPoints.forEach((pt, index) => {
      this.addBoundaryPointMarker(pt[0], pt[1], index);
    });

    if (this.boundaryPoints.length > 0) {
      const center = this.calculateCentroid(this.boundaryPoints);
      this.map.setCenter(center);
      this.map.setZoom(15);
      
      if (this.pickerMarker) {
        this.pickerMarker.setLngLat(center);
      }
    }

    this.drawPolygon();
  }

  private initMap(): void {
    try {
      this.map = this.mapboxService.initializeMap(
        this.mapContainer.nativeElement,
        this.center,
        this.zoom
      );

      const onMapLoad = () => {
        this.zone.run(() => {
          this.loading = false;
          this.styleLoaded = true;
          
          if (this.map) {
            this.map.resize();
          }

          // Redraw custom boundaries and markers when map style loaded/reloaded
          if (this.boundaryPoints.length >= 2) {
            this.drawPolygon();
          }

          if (this.mode === 'picker') {
            this.setupPickerMode();
          } else if (this.mode === 'detail') {
            this.setupDetailMode();
          } else {
            this.updateMarkers();
          }
          
          this.cdr.detectChanges();
        });
      };

      // Safety timeout fallback to guarantee spinner is hidden
      setTimeout(() => {
        this.zone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      }, 1500);

      // Listen on style loaded events persistently to rebuild vector layers on style toggle
      this.map.on('style.load', onMapLoad);
      
      // Bind click handler once on the map instance to handle both pin dragging and boundary plotting
      this.map.on('click', (e: any) => {
        this.zone.run(() => {
          if (this.mode !== 'picker') return;

          if (this.drawMode === 'pin') {
            if (this.pickerMarker) {
              this.pickerMarker.setLngLat(e.lngLat);
              this.handleReverseGeocode(e.lngLat.lng, e.lngLat.lat);
            }
          } else {
            // Draw mode - place vertex dot
            const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
            this.boundaryPoints = [...this.boundaryPoints, point];
            this.addBoundaryPointMarker(point[0], point[1], this.boundaryPoints.length - 1);
            this.drawPolygon();
            this.updateBoundaryResults();
          }
        });
      });

      // Listen to map movements (pan/zoom/drag) to redraw the SVG overlay lines dynamically
      this.map.on('move', () => {
        this.zone.run(() => {}); // Trigger Angular change detection reflow
      });

      // Trigger initial load if ready
      if (this.map.isStyleLoaded()) {
        onMapLoad();
      }
    } catch (e) {
      console.error('Error loading Mapbox', e);
      this.zone.run(() => {
        this.loading = false;
      });
    }
  }

  setDrawMode(mode: 'pin' | 'draw'): void {
    this.drawMode = mode;
    this.clearBoundary();
    
    if (mode === 'pin') {
      if (this.pickerMarker) {
        this.pickerMarker.addTo(this.map);
      } else {
        this.setupPickerMode();
      }
    } else {
      if (this.pickerMarker) {
        this.pickerMarker.remove();
      }
    }
  }

  private setupPickerMode(): void {
    if (this.pickerMarker) {
      this.pickerMarker.remove();
    }

    if (this.map) {
      this.map.resize();
    }

    const initMarkerAt = (lng: number, lat: number) => {
      const color = '#10b981'; // emerald picker marker
      this.pickerMarker = new mapboxgl.Marker({ color, draggable: true })
        .setLngLat([lng, lat])
        .addTo(this.map);

      this.map.flyTo({
        center: [lng, lat],
        zoom: 15,
        speed: 1.4,
        curve: 1.4,
        essential: true
      });

      const onMarkerMove = () => {
        const lngLat = this.pickerMarker!.getLngLat();
        this.zone.run(() => {
          this.handleReverseGeocode(lngLat.lng, lngLat.lat);
        });
      };

      this.pickerMarker.on('dragend', onMarkerMove);

      // Initial emit
      this.zone.run(() => {
        this.handleReverseGeocode(lng, lat);
      });
    };

    // Try to get user's real location and fly there
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.zone.run(() => {
            initMarkerAt(pos.coords.longitude, pos.coords.latitude);
          });
        },
        () => {
          // Permission denied or unavailable — fall back to default
          initMarkerAt(this.pickerLng, this.pickerLat);
        },
        { timeout: 6000, maximumAge: 60000, enableHighAccuracy: true }
      );
    } else {
      // Browser doesn't support geolocation
      initMarkerAt(this.pickerLng, this.pickerLat);
    }
  }


  private addBoundaryPointMarker(lng: number, lat: number, index: number): void {
    const el = document.createElement('div');
    el.style.width = '14px';
    el.style.height = '14px';
    el.style.backgroundColor = '#10b981';
    el.style.border = '2px solid #ffffff';
    el.style.borderRadius = '50%';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    el.style.cursor = 'pointer';
    el.style.display = 'block';

    // Prevent map click bubble when clicking on the boundary dot element
    el.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    const marker = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(this.map);

    marker.on('drag', () => {
      this.zone.run(() => {
        const newLngLat = marker.getLngLat();
        const updated = [...this.boundaryPoints];
        updated[index] = [newLngLat.lng, newLngLat.lat];
        this.boundaryPoints = updated;
        this.drawPolygon();
        this.updateBoundaryResults();
      });
    });

    this.boundaryMarkers.push(marker);
  }

  get svgPoints(): string {
    if (!this.map || this.boundaryPoints.length < 2) return '';
    return this.boundaryPoints
      .map(pt => {
        try {
          const pix = this.map.project(pt);
          return `${pix.x},${pix.y}`;
        } catch (e) {
          return '';
        }
      })
      .filter(Boolean)
      .join(' ');
  }

  private drawPolygon(): void {
    if (!this.map || this.boundaryPoints.length < 2) return;

    const lineSourceId = 'boundary-line-source';
    const fillSourceId = 'boundary-fill-source';

    const closedCoords = [...this.boundaryPoints];
    closedCoords.push(closedCoords[0]); // Connect back to first dot

    const lineGeoJson = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: closedCoords
        },
        properties: {}
      }]
    };

    const fillGeoJson = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [closedCoords]
        },
        properties: {}
      }]
    };

    try {
      // 1. Draw/Update Line Outline
      const lineSource = this.map.getSource(lineSourceId) as mapboxgl.GeoJSONSource;
      if (lineSource) {
        lineSource.setData(lineGeoJson);
      } else {
        this.map.addSource(lineSourceId, {
          type: 'geojson',
          data: lineGeoJson
        });

        this.map.addLayer({
          id: 'boundary-line',
          type: 'line',
          source: lineSourceId,
          paint: {
            'line-color': '#10b981',
            'line-width': 4
          }
        });
      }

      // 2. Draw/Update Shaded Fill (Only if 3 or more dots)
      if (this.boundaryPoints.length >= 3) {
        const fillSource = this.map.getSource(fillSourceId) as mapboxgl.GeoJSONSource;
        if (fillSource) {
          fillSource.setData(fillGeoJson);
        } else {
          this.map.addSource(fillSourceId, {
            type: 'geojson',
            data: fillGeoJson
          });

          // Insert fill layer beneath outline for visual structure
          this.map.addLayer({
            id: 'boundary-fill',
            type: 'fill',
            source: fillSourceId,
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': 0.22
            }
          }, 'boundary-line');
        }
      } else {
        // If we drop below 3 points, clean up fill layer/source
        if (this.map.getLayer('boundary-fill')) this.map.removeLayer('boundary-fill');
        if (this.map.getSource(fillSourceId)) this.map.removeSource(fillSourceId);
      }
    } catch (e) {
      console.error('Error drawing boundary polygon', e);
    }
  }

  private updateBoundaryResults(): void {
    if (this.boundaryPoints.length === 0) return;

    let center: [number, number];
    let area = 0;

    if (this.boundaryPoints.length === 1) {
      center = this.boundaryPoints[0];
    } else if (this.boundaryPoints.length === 2) {
      center = [
        (this.boundaryPoints[0][0] + this.boundaryPoints[1][0]) / 2,
        (this.boundaryPoints[0][1] + this.boundaryPoints[1][1]) / 2
      ];
    } else {
      center = this.calculateCentroid(this.boundaryPoints);
      area = this.calculatePolygonArea(this.boundaryPoints);
    }

    this.mapboxService.reverseGeocode(center[0], center[1]).subscribe({
      next: (details) => {
        this.locationSelected.emit({
          lat: Number(center[1].toFixed(6)),
          lng: Number(center[0].toFixed(6)),
          address: details.address || '',
          village: details.village || '',
          district: details.district || '',
          state: details.state || '',
          pincode: details.pincode || '',
          area: area > 0 ? area : undefined,
          boundary: [...this.boundaryPoints]
        });
      }
    });
  }

  private calculateCentroid(points: [number, number][]): [number, number] {
    let sumLng = 0;
    let sumLat = 0;
    points.forEach(pt => {
      sumLng += pt[0];
      sumLat += pt[1];
    });
    return [sumLng / points.length, sumLat / points.length];
  }

  private calculatePolygonArea(points: [number, number][]): number {
    if (points.length < 3) return 0;
    
    // Convert to local mercator flat approximations
    const R = 6378137;
    const xCoords = points.map(pt => pt[0] * Math.PI / 180 * R * Math.cos(pt[1] * Math.PI / 180));
    const yCoords = points.map(pt => pt[1] * Math.PI / 180 * R);

    let area = 0;
    const j = xCoords.length - 1;
    for (let i = 0; i < xCoords.length; i++) {
      const prevIndex = i === 0 ? j : i - 1;
      area += (xCoords[prevIndex] + xCoords[i]) * (yCoords[prevIndex] - yCoords[i]);
    }
    
    const absAreaSqMeters = Math.abs(area / 2);
    const acres = absAreaSqMeters / 4046.86;
    return Number(acres.toFixed(2));
  }

  clearBoundary(): void {
    this.boundaryPoints = [];
    this.boundaryMarkers.forEach(m => m.remove());
    this.boundaryMarkers = [];
    
    const lineSourceId = 'boundary-line-source';
    const fillSourceId = 'boundary-fill-source';

    if (this.map) {
      if (this.map.getLayer('boundary-fill')) {
        this.map.removeLayer('boundary-fill');
      }
      if (this.map.getSource(fillSourceId)) {
        this.map.removeSource(fillSourceId);
      }

      if (this.map.getLayer('boundary-line')) {
        this.map.removeLayer('boundary-line');
      }
      if (this.map.getSource(lineSourceId)) {
        this.map.removeSource(lineSourceId);
      }
    }
  }

  private handleReverseGeocode(lng: number, lat: number): void {
    this.mapboxService.reverseGeocode(lng, lat).subscribe({
      next: (details) => {
        this.locationSelected.emit({
          lat,
          lng,
          address: details.address || '',
          village: details.village || '',
          district: details.district || '',
          state: details.state || '',
          pincode: details.pincode || ''
        });
      },
      error: () => {
        this.locationSelected.emit({
          lat,
          lng,
          address: '',
          village: '',
          district: '',
          state: '',
          pincode: ''
        });
      }
    });
  }

  private parseBoundaryFromDescription(desc: string): [number, number][] | null {
    try {
      const match = desc.match(/\[BOUNDS\]:\s*(\[.*?\])/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } catch (e) {
      console.error('Failed to parse boundary coordinates', e);
    }
    return null;
  }

  private setupDetailMode(): void {
    if (this.properties.length > 0) {
      const p = this.properties[0];
      this.mapboxService.addPropertyMarker(this.map, p);
      
      const customBoundary = this.parseBoundaryFromDescription(p.description || '');
      if (customBoundary && customBoundary.length > 0) {
        this.boundaryPoints = customBoundary;
        this.drawMode = 'draw';
        
        // Also place static markers (dots) on each vertex of the boundary in detail view for visual clarity
        this.boundaryPoints.forEach(pt => {
          const el = document.createElement('div');
          el.style.width = '8px';
          el.style.height = '8px';
          el.style.backgroundColor = '#10b981';
          el.style.border = '1px solid #ffffff';
          el.style.borderRadius = '50%';
          el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
          
          const m = new mapboxgl.Marker({ element: el })
            .setLngLat(pt)
            .addTo(this.map);
          this.markers.push(m);
        });
      } else {
        // Draw details boundary hexagon approximation fallback
        this.drawVisualBoundary(p.longitude, p.latitude, p.area);
      }

      this.map.setCenter([p.longitude, p.latitude]);
      this.map.setZoom(16);
    } else {
      new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat(this.center)
        .addTo(this.map);
    }
  }

  private drawVisualBoundary(lng: number, lat: number, areaInAcres: number): void {
    if (!this.map) return;

    // 1 Acre = 4046.86 sq meters. Circle Area = pi * r^2 => r = sqrt(Area / pi)
    const areaSqMeters = (areaInAcres || 1) * 4046.86;
    const radius = Math.sqrt(areaSqMeters / Math.PI);

    const points: [number, number][] = [];
    const R = 6378137;
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * Math.PI / 180;
      const dLat = (radius * Math.sin(angle)) / R * 180 / Math.PI;
      const dLng = (radius * Math.cos(angle)) / (R * Math.cos(lat * Math.PI / 180)) * 180 / Math.PI;
      points.push([lng + dLng, lat + dLat]);
    }
    points.push(points[0]);

    const sourceId = 'property-detail-boundary';
    
    if (this.map.getSource(sourceId)) {
      this.map.removeLayer('property-detail-fill');
      this.map.removeLayer('property-detail-line');
      this.map.removeSource(sourceId);
    }

    this.map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [points]
        },
        properties: {}
      }
    });

    this.map.addLayer({
      id: 'property-detail-fill',
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#10b981',
        'fill-opacity': 0.15
      }
    });

    this.map.addLayer({
      id: 'property-detail-line',
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#10b981',
        'line-width': 2,
        'line-dasharray': [2, 2]
      }
    });
  }

  private updateMarkers(): void {
    this.clearMarkers();

    if (this.mode === 'view') {
      const sourceId = 'properties-source';
      
      if (this.map.getSource(sourceId)) {
        this.map.removeLayer('cluster-count');
        this.map.removeLayer('clusters');
        this.map.removeSource(sourceId);
      }

      const features = this.properties.map(p => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.longitude, p.latitude]
        },
        properties: {
          id: p.id,
          title: p.title,
          price: p.price,
          area: p.area,
          status: p.status
        }
      }));

      this.map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      this.map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0f766e',
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      this.map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      this.map.on('click', 'clusters', (e: any) => {
        const features = this.map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0].properties!['cluster_id'];
        (this.map.getSource(sourceId) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          this.map.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom: zoom! + 1
          });
        });
      });

      const updateUnclusteredMarkers = () => {
        this.clearMarkers();
        this.properties.forEach(p => {
          const marker = this.mapboxService.addPropertyMarker(this.map, p, (clicked) => {
            this.map.easeTo({ center: [clicked.longitude, clicked.latitude], zoom: 12 });
          });
          this.markers.push(marker);
        });
      };

      updateUnclusteredMarkers();
    }
  }

  private clearMarkers(): void {
    this.markers.forEach(m => m.remove());
    this.markers = [];
  }

  toggleMapStyle(): void {
    if (!this.map) return;
    this.isSatellite = !this.isSatellite;
    const style = this.isSatellite
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/streets-v12';
    
    this.styleLoaded = false;
    this.map.setStyle(style);
    
    setTimeout(() => {
      if (this.map) {
        this.map.resize();
      }
    }, 200);
  }

  ngOnDestroy(): void {
    this.clearMarkers();
    this.clearBoundary();
    if (this.pickerMarker) this.pickerMarker.remove();
    if (this.map) this.map.remove();
  }
}
