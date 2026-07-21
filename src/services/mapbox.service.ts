import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import type { Property } from '../models/property.models';

const getMapboxConfig = () => ({
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  style: import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/streets-v12'
});

class ThreeDControl {
  private _map: mapboxgl.Map | undefined;
  private _container: HTMLDivElement | undefined;
  private _btn: HTMLButtonElement | undefined;
  private _updateText: () => void = () => {};

  onAdd(map: mapboxgl.Map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    
    this._btn = document.createElement('button');
    this._btn.type = 'button';
    this._btn.textContent = '3D';
    this._btn.style.fontWeight = 'bold';
    this._btn.style.fontSize = '11px';
    this._btn.style.width = '29px';
    this._btn.style.height = '29px';
    this._btn.style.fontFamily = 'inherit';
    this._btn.title = 'Toggle 3D View';
    
    this._updateText = () => {
      if (this._btn && this._map) {
        this._btn.textContent = this._map.getPitch() > 0 ? '2D' : '3D';
      }
    };
    
    map.on('pitchend', this._updateText);

    this._btn.onclick = () => {
      if (!this._map) return;
      const is3D = this._map.getPitch() > 0;
      this._map.easeTo({ pitch: is3D ? 0 : 60, bearing: is3D ? 0 : -17.6, duration: 1000 });
    };

    this._container.appendChild(this._btn);
    return this._container;
  }

  onRemove() {
    if (this._map) {
      this._map.off('pitchend', this._updateText);
    }
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._map = undefined;
  }
}

export const mapboxService = {
  initializeMap: (container: string | HTMLElement, center: [number, number] = [80.4365, 16.3067], zoom = 10): mapboxgl.Map => {
    const config = getMapboxConfig();
    mapboxgl.accessToken = config.accessToken;
    
    const mapInstance = new mapboxgl.Map({
      container,
      style: config.style,
      center,
      zoom,
      pitch: 0,
      bearing: 0
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstance.addControl(new ThreeDControl(), 'top-right');

    return mapInstance;
  },

  geocode: async (address: string): Promise<[number, number] | null> => {
    const config = getMapboxConfig();
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${config.accessToken}&limit=1`;
    const response = await axios.get(url);
    const res = response.data;
    if (res.features && res.features.length > 0) {
      return res.features[0].center as [number, number];
    }
    return null;
  },

  reverseGeocode: async (lng: number, lat: number): Promise<any> => {
    const config = getMapboxConfig();
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${config.accessToken}&types=address,locality,neighborhood,postcode,place,district,region`;
    const response = await axios.get(url);
    const res = response.data;
    
    const details = { address: '', village: '', district: '', state: '', pincode: '' };

    if (res.features && res.features.length > 0) {
      details.address = res.features[0].place_name;
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
  },

  getMarkerColor: (status: string): string => {
    switch (status) {
      case 'APPROVED': return '#10b981';
      case 'PENDING_AI':
      case 'PENDING_GOVT': return '#f59e0b';
      case 'REJECTED':
      case 'DISPUTED':
      default: return '#ef4444';
    }
  },

  addPropertyMarker: (mapInstance: mapboxgl.Map, property: Property, onClick?: (p: Property) => void): mapboxgl.Marker => {
    const color = mapboxService.getMarkerColor(property.status);

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
};
