'use client';

import { useEffect, useRef } from 'react';
import { Event } from '@/types';

interface EventMapProps {
  events: Event[];
  selectedEvent?: Event | null;
  onEventSelect?: (event: Event) => void;
}

export default function EventMap({ events, selectedEvent, onEventSelect }: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markers = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    const initializeMap = async () => {
      try {
        const L = await import('leaflet');
        
        // Fix for default markers in Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        if (!mapInstance.current && mapRef.current) {
          mapInstance.current = L.map(mapRef.current).setView([40.7128, -74.0060], 2);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(mapInstance.current);
        }

        // Clear existing markers
        markers.current.forEach(marker => {
          mapInstance.current.removeLayer(marker);
        });
        markers.current = [];

        // Add markers for events
        events.forEach(event => {
          const lat = parseFloat(event.venue.latitude);
          const lng = parseFloat(event.venue.longitude);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const marker = L.marker([lat, lng]).addTo(mapInstance.current);
            
            const popupContent = `
              <div class="p-2">
                <h3 class="font-bold text-sm mb-1">${event.lineup.join(', ')}</h3>
                <p class="text-xs text-gray-600 mb-1">${event.venue.name}</p>
                <p class="text-xs text-gray-500">${event.venue.city}, ${event.venue.country}</p>
                <p class="text-xs text-gray-500">${new Date(event.datetime).toLocaleDateString()}</p>
              </div>
            `;
            
            marker.bindPopup(popupContent);
            
            if (onEventSelect) {
              marker.on('click', () => {
                onEventSelect(event);
              });
            }
            
            markers.current.push(marker);
          }
        });

        // Fit map to show all markers if there are any
        if (markers.current.length > 0) {
          const group = L.featureGroup(markers.current);
          mapInstance.current.fitBounds(group.getBounds().pad(0.1));
        }

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [events, onEventSelect]);

  // Highlight selected event
  useEffect(() => {
    if (!selectedEvent || !mapInstance.current) return;

    const lat = parseFloat(selectedEvent.venue.latitude);
    const lng = parseFloat(selectedEvent.venue.longitude);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      mapInstance.current.setView([lat, lng], 10);
    }
  }, [selectedEvent]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Event Locations
        </h2>
      </div>
      <div 
        ref={mapRef} 
        className="w-full h-96"
        style={{ height: '400px' }}
      />
    </div>
  );
}