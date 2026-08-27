import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { POI, Category } from '../types';
import { Star, Layers, Plus, MapPin } from 'lucide-react';

interface MapViewProps {
  pois: POI[];
  categories: Category[];
  days?: Day[];
  selectedCategory: string | null;
  onSelectCategory: (catId: string | null) => void;
  selectedDayId?: string | null;
  onSelectDayId?: (dayId: string | null) => void;
  onlyTop: boolean;
  onToggleOnlyTop: () => void;
  onSelectPoi: (poi: POI) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onOpenQuickAdd?: () => void;
  isDarkMode: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  pois,
  categories,
  days = [],
  selectedCategory,
  onSelectCategory,
  selectedDayId = null,
  onSelectDayId,
  onlyTop,
  onToggleOnlyTop,
  onSelectPoi,
  onMapClick,
  onOpenQuickAdd,
  isDarkMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const safePois = pois || [];

  // Filter POIs by Category, Top, and Day
  const filteredPois = safePois.filter((p) => {
    if (selectedDayId && p.day_id !== selectedDayId) return false;
    if (onlyTop && !p.is_top) return false;
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    return true;
  });

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Outdoor light style vs Dark mode style using OpenStreetMap / Carto basemaps
    const styleUrl = isDarkMode
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [80.7, 7.1], // Initial center (e.g. Sri Lanka demo)
      zoom: 8,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    // Handle map click to add point anywhere
    map.on('click', (e) => {
      if (onMapClick) {
        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isDarkMode]);

  // Update Markers & Route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (filteredPois.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    const coordinates: [number, number][] = [];

    filteredPois.forEach((poi) => {
      if (typeof poi.lat !== 'number' || typeof poi.lng !== 'number') return;

      coordinates.push([poi.lng, poi.lat]);
      bounds.extend([poi.lng, poi.lat]);

      // Create Custom Marker DOM element
      const el = document.createElement('div');
      el.className = 'custom-poi-marker group cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 active:scale-95';
      el.setAttribute('aria-label', `${poi.name} ${poi.is_top ? '★ TOP' : ''}`);

      const photoUrl =
        poi.main_photo_url ||
        'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=150&q=80';

      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          ${
            poi.is_top
              ? `
              <div class="absolute -inset-1.5 rounded-full bg-outdoor-top dark:bg-outdoor-dark-top animate-pulse opacity-75"></div>
              <div class="absolute -inset-1 rounded-full border-2 border-white dark:border-stone-900 bg-outdoor-top dark:bg-outdoor-dark-top shadow-md"></div>
            `
              : `
              <div class="absolute -inset-0.5 rounded-full border-2 border-white dark:border-stone-900 bg-outdoor-teal dark:bg-outdoor-teal-dark shadow"></div>
            `
          }
          
          <div class="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-stone-800 shadow-sm bg-stone-200">
            <img src="${photoUrl}" alt="${poi.name}" class="w-full h-full object-cover" />
          </div>

          ${
            poi.is_top
              ? `
            <div class="absolute -top-2 -right-1 bg-outdoor-top text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow border-2 border-white dark:border-stone-900">
              ★
            </div>
          `
              : ''
          }
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectPoi(poi);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([poi.lng, poi.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Fit map bounds to show all markers
    if (coordinates.length > 0) {
      map.fitBounds(bounds, {
        padding: { top: 70, bottom: 90, left: 40, right: 40 },
        maxZoom: 14,
        duration: 800,
      });
    }

    // Draw route polyline
    map.on('load', () => {
      drawRouteLine(map, coordinates);
    });

    if (map.isStyleLoaded()) {
      drawRouteLine(map, coordinates);
    }
  }, [filteredPois, onSelectPoi, isDarkMode]);

  function drawRouteLine(map: maplibregl.Map, coords: [number, number][]) {
    if (coords.length < 2) return;

    try {
      const sourceId = 'trip-route-source';
      const layerCasingId = 'trip-route-casing';
      const layerInnerId = 'trip-route-inner';

      const geojsonData: any = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      };

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojsonData);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData,
        });

        // Route Casing (dark border for contrast)
        map.addLayer({
          id: layerCasingId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': isDarkMode ? '#071B20' : '#102A30',
            'line-width': 7,
            'line-opacity': 0.8,
          },
        });

        // Inner Route Line
        map.addLayer({
          id: layerInnerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': isDarkMode ? '#55C6CE' : '#006D77',
            'line-width': 4,
          },
        });
      }
    } catch (e) {
      console.warn('MapLibre drawRouteLine notice:', e);
    }
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Filter Pills on Top of Map */}
      <div className="absolute top-3 left-3 right-14 z-20 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pointer-events-auto">
        {/* Day / Whole Route Filter */}
        {days.length > 0 && onSelectDayId && (
          <select
            value={selectedDayId || ''}
            onChange={(e) => onSelectDayId(e.target.value ? e.target.value : null)}
            className="text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all flex-shrink-0 bg-white/95 dark:bg-stone-800 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700 outline-none cursor-pointer"
          >
            <option value="">🗺️ Celá trasa ({days.length} dní)</option>
            {days.map((d) => (
              <option key={d.id} value={d.id}>
                Den {d.day_number}: {d.title}
              </option>
            ))}
          </select>
        )}

        {/* TOP Filter */}
        <button
          onClick={onToggleOnlyTop}
          className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all flex-shrink-0 active:scale-95 ${
            onlyTop
              ? 'bg-outdoor-top text-white ring-2 ring-white dark:ring-stone-800'
              : 'bg-white/95 dark:bg-outdoor-dark-card/95 text-outdoor-text dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-50'
          }`}
          aria-label="Filtr pouze TOP místa"
        >
          <Star className={`w-3.5 h-3.5 ${onlyTop ? 'fill-white text-white' : 'text-outdoor-top fill-outdoor-top'}`} />
          <span>★ TOP</span>
        </button>

        {/* All categories pill */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md transition-all flex-shrink-0 active:scale-95 ${
            selectedCategory === null
              ? 'bg-outdoor-teal-dark text-white ring-2 ring-white dark:ring-stone-800'
              : 'bg-white/95 dark:bg-outdoor-dark-card/95 text-outdoor-text dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Všechny ({safePois.length})</span>
        </button>

        {/* Category Pills */}
        {categories.map((cat) => {
          const count = safePois.filter((p) => p.category_id === cat.id).length;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? null : cat.id)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md transition-all flex-shrink-0 active:scale-95 ${
                isSelected
                  ? 'bg-outdoor-teal-dark text-white ring-2 ring-white dark:ring-stone-800'
                  : 'bg-white/95 dark:bg-outdoor-dark-card/95 text-outdoor-text dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-50'
              }`}
            >
              <span>{cat.label_cs.split('/')[0].trim()}</span>
              {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Floating Add POI Button & Hint */}
      <div className="absolute bottom-6 right-4 z-10 flex flex-col items-end gap-2 pointer-events-auto">
        <div className="hidden sm:block text-[11px] font-semibold bg-stone-900/80 text-white px-3 py-1.5 rounded-xl backdrop-blur-sm shadow-lg border border-white/10">
          💡 Kliknutím kamkoliv do mapy přidáte bod
        </div>

        {onOpenQuickAdd && (
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-outdoor-coral hover:bg-outdoor-coral/90 text-white font-bold text-sm shadow-xl transition-all active:scale-95 hover:shadow-2xl"
            title="Přidat nový bod zájmu do cesty"
          >
            <Plus className="w-4 h-4" />
            <span>+ Přidat bod</span>
          </button>
        )}
      </div>
    </div>
  );
};
