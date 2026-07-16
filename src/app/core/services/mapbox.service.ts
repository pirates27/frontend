import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import mapboxgl from 'mapbox-gl';
import { environment } from '../../../environments/environment';
import { Property } from '../models/property.models';

@Injectable({
  providedIn: 'root'
})
export class MapboxService {
  private http = inject(HttpClient);

  // Initialize Map
  initializeMap(container: string | HTMLElement, center: [number, number] = [80.4365, 16.3067], zoom = 10): mapboxgl.Map {
    mapboxgl.accessToken = environment.mapbox.accessToken;
    
    const mapInstance = new mapboxgl.Map({
      container,
      style: environment.mapbox.style,
      center,
      zoom
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstance.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true
    }), 'top-right');

    return mapInstance;
  }

  // Forward Geocoding: address -> coordinates
  geocode(address: string): Observable<[number, number] | null> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${environment.mapbox.accessToken}&limit=1`;
    return this.http.get<any>(url).pipe(
      map((res: any) => {
        if (res.features && res.features.length > 0) {
          return res.features[0].center as [number, number]; // [lng, lat]
        }
        return null;
      })
    );
  }

  // Reverse Geocoding: coordinates -> address details
  reverseGeocode(lng: number, lat: number): Observable<any> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${environment.mapbox.accessToken}&types=address,locality,neighborhood,postcode`;
    return this.http.get<any>(url).pipe(
      map((res: any) => {
        const details = {
          address: '',
          village: '',
          district: '',
          state: '',
          pincode: ''
        };

        if (res.features && res.features.length > 0) {
          details.address = res.features[0].place_name;

          // Parse context fields for village, district, state, pincode
          for (const feature of res.features) {
            if (feature.place_type.includes('postcode')) {
              details.pincode = feature.text;
            } else if (feature.place_type.includes('locality')) {
              details.village = feature.text;
            } else if (feature.place_type.includes('place') || feature.place_type.includes('district')) {
              details.district = feature.text;
            } else if (feature.place_type.includes('region')) {
              details.state = feature.text;
            }
          }
        }
        return details;
      })
    );
  }

  // Get color based on property status
  getMarkerColor(status: string): string {
    switch (status) {
      case 'APPROVED':
        return '#10b981'; // Emerald Green
      case 'PENDING_AI':
      case 'PENDING_GOVT':
        return '#f59e0b'; // Amber Yellow
      case 'REJECTED':
      case 'DISPUTED':
      default:
        return '#ef4444'; // Red
    }
  }

  // Add marker with popup to map
  addPropertyMarker(mapInstance: mapboxgl.Map, property: Property, onClick?: (p: Property) => void): mapboxgl.Marker {
    const color = this.getMarkerColor(property.status);

    const popupHtml = `
      <div style="font-family: sans-serif; padding: 5px;">
        <h4 style="margin: 0 0 5px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${property.title}</h4>
        <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px;">₹${property.price.toLocaleString('en-IN')} • ${property.area} acres</p>
        <span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 4px; color: white; background-color: ${color};">${property.status}</span>
      </div>
    `;

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml);

    const marker = new mapboxgl.Marker({ color })
      .setLngLat([property.longitude, property.latitude])
      .setPopup(popup)
      .addTo(mapInstance);

    if (onClick) {
      marker.getElement().addEventListener('click', () => {
        onClick(property);
      });
    }

    return marker;
  }
}
