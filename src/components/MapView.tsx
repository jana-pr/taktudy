import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { POI, Category, Day, Tip, Accommodation } from '../types';
import { Star, Layers, Plus, MapPin, Lightbulb, Bed, ExternalLink } from 'lucide-react';

interface MapViewProps {
  pois: POI[];
  categories: Category[];
  days?: Day[];
  tips?: Tip[];
  accommodations?: Accommodation[];
  showTips?: boolean;
  onToggleShowTips?: () => void;
  selectedCategory: string | null;
  onSelectCategory: (catId: string | null) => void;
  selectedDayId?: string | null;
  onSelectDayId?: (dayId: string | null) => void;
  onlyTop: boolean;
  onToggleOnlyTop: () => void;
  onSelectPoi: (poi: POI) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onOpenQuickAdd?: () => void;
  onNavigateToAccommodations?: () => void;
  isDarkMode: boolean;
}

const KNOWN_LOCATION_COORDS: Record<string, [number, number]> = {
  'negombo': [7.2089, 79.8358],
  'habarana': [8.0336, 80.7516],
  'sigiriya': [7.9570, 80.7603],
  'dambulla': [7.8731, 80.6517],
  'polonnaruwa': [7.9403, 81.0188],
  'kandy': [7.2906, 80.6337],
  'nuwara eliya': [6.9697, 80.7674],
  'ella': [6.8667, 81.0466],
  'tissamaharama': [6.2778, 81.2861],
  'yala': [6.2778, 81.2861],
  'mirissa': [5.9482, 80.4568],
  'weligama': [5.9725, 80.4289],
  'galle': [6.0329, 80.2168],
  'katunayake': [7.1650, 79.8880],
  'colombo': [6.9271, 79.8612],
};

function getAccommodationCoords(acc: Accommodation): { lat: number; lng: number } | null {
  if (typeof acc.lat === 'number' && typeof acc.lng === 'number') {
    return { lat: acc.lat, lng: acc.lng };
  }

  if (acc.location) {
    const locLower = acc.location.toLowerCase();
    for (const [key, [lat, lng]] of Object.entries(KNOWN_LOCATION_COORDS)) {
      if (locLower.includes(key)) {
        return { lat, lng };
      }
    }
  }

  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  pois,
  categories,
  days = [],
  tips = [],
  accommodations = [],
  showTips = false,
  onToggleShowTips,
  selectedCategory,
  onSelectCategory,
  selectedDayId = null,
  onSelectDayId,
  onlyTop,
  onToggleOnlyTop,
  onSelectPoi,
  onMapClick,
  onOpenQuickAdd,
  onNavigateToAccommodations,
  isDarkMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const safePois = pois || [];
  const safeAccommodations = accommodations || [];

  // Multi-select categories state
  const [selectedCats, setSelectedCats] = useState<string[]>(() => {
    return selectedCategory ? [selectedCategory] : [];
  });

  const toggleCategory = (catId: string) => {
    setSelectedCats((prev) => {
      if (prev.includes(catId)) {
        return prev.filter((id) => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const clearCategories = () => {
    setSelectedCats([]);
    onSelectCategory(null);
  };

  // Attach global handler for opening accommodation detail from popup
  useEffect(() => {
    (window as any).__openAccommodationTab = () => {
      if (onNavigateToAccommodations) {
        onNavigateToAccommodations();
      }
    };
    return () => {
      delete (window as any).__openAccommodationTab;
    };
  }, [onNavigateToAccommodations]);

  // Toggle showing accommodations on map (default ON)
  const [showAccommodations, setShowAccommodations] = useState(true);

  // Filter POIs by Category (Multiselect), Top, and Day
  const filteredPois = safePois.filter((p) => {
    if (selectedDayId && p.day_id !== selectedDayId) return false;
    if (onlyTop && !p.is_top) return false;
    if (selectedCats.length > 0 && !selectedCats.includes(p.category_id)) return false;
    return true;
  });

  // Filter Accommodations by Day
  const filteredAccommodations = safeAccommodations.filter((acc) => {
    if (selectedDayId && acc.day_id && acc.day_id !== selectedDayId) return false;
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

    const bounds = new maplibregl.LngLatBounds();
    const coordinates: [number, number][] = [];

    // Render POI markers
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

    // Render Accommodations / Hotels markers
    if (showAccommodations || selectedCategory === 'accommodation') {
      filteredAccommodations.forEach((acc, idx) => {
        const coords = getAccommodationCoords(acc);
        if (!coords) return;

        bounds.extend([coords.lng, coords.lat]);

        const dayObj = days.find((d) => d.id === acc.day_id);
        const dayLabel = dayObj ? `Den ${dayObj.day_number}` : `Noc ${idx + 1}`;

        const accEl = document.createElement('div');
        accEl.className = 'custom-hotel-marker cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125';
        accEl.setAttribute('aria-label', `Ubytování: ${acc.hotel_name}`);
        accEl.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-9 h-9 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-xl border-2 border-white dark:border-stone-900 ring-2 ring-teal-300">
              <span class="text-sm">🏨</span>
            </div>
            <div class="absolute -top-2 -right-1.5 bg-teal-800 text-white text-[9px] font-black px-1 rounded-full shadow border border-white">
              ${idx + 1}
            </div>
          </div>
        `;

        const bookingBtn = acc.booking_url
          ? `<a href="${acc.booking_url}" target="_blank" rel="noopener noreferrer" style="display:block; margin-top:6px; padding:6px 10px; background:#f0fdfa; color:#0f766e; border:1px solid #0f766e; font-weight:bold; font-size:11px; text-align:center; border-radius:8px; text-decoration:none;">Otevřít na Booking.com ↗</a>`
          : '';

        const detailBtn = `<button onclick="window.__openAccommodationTab && window.__openAccommodationTab()" style="display:block; width:100%; margin-top:8px; padding:7px 10px; background:#0f766e; color:#ffffff; font-weight:bold; font-size:11px; text-align:center; border-radius:8px; border:none; cursor:pointer;">Přejít na Ubytování 🛏️</button>`;

        const popup = new maplibregl.Popup({ offset: 18 }).setHTML(`
          <div style="font-family: inherit; font-size: 12px; padding: 2px; line-height: 1.4;">
            <div style="color: #0d9488; font-size: 10px; font-weight: bold; text-transform: uppercase;">
              🏨 Ubytování • ${dayLabel}
            </div>
            <div style="font-weight: bold; font-size: 13px; color: #111827; margin-top: 2px;">
              ${acc.hotel_name}
            </div>
            ${acc.location ? `<div style="color: #6b7280; font-size: 11px; margin-top: 2px;">📍 ${acc.location}</div>` : ''}
            ${acc.room_type ? `<div style="color: #374151; font-size: 11px; margin-top: 2px;">🛏️ ${acc.room_type}</div>` : ''}
            ${acc.price_total ? `<div style="font-weight: bold; color: #047857; margin-top: 4px;">$${acc.price_total} ${acc.price_currency || 'USD'} / noc</div>` : ''}
            ${acc.cancellation_policy ? `<div style="color: #4b5563; font-size: 10px; margin-top: 2px;">🛡️ ${acc.cancellation_policy}</div>` : ''}
            ${detailBtn}
            ${bookingBtn}
          </div>
        `);

        const marker = new maplibregl.Marker({ element: accEl })
          .setLngLat([coords.lng, coords.lat])
          .setPopup(popup)
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    }

    // Render tips from Wishlist if enabled
    if (showTips && tips.length > 0) {
      tips.forEach((tip) => {
        if (!tip.lat || !tip.lng) return;
        bounds.extend([tip.lng, tip.lat]);

        const tipEl = document.createElement('div');
        tipEl.className = 'custom-tip-marker cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125';
        tipEl.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-amber-300">
              💡
            </div>
            <div class="absolute -top-1.5 -right-1 bg-amber-700 text-white text-[8px] font-black px-1 rounded-full shadow border border-white">
              TIP
            </div>
          </div>
        `;

        const photoHtml = tip.photo_url
          ? `<div style="width:100%; height:80px; overflow:hidden; border-radius:6px; margin-bottom:6px;">
               <img src="${tip.photo_url}" alt="${tip.title}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'" />
             </div>`
          : '';

        const urlHtml = tip.source_url
          ? `<a href="${tip.source_url}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-top:6px; padding:4px 8px; background:#fef3c7; color:#92400e; font-weight:bold; font-size:10px; border-radius:6px; text-decoration:none;">Otevřít odkaz ↗</a>`
          : '';

        const popup = new maplibregl.Popup({ offset: 16 }).setHTML(`
          <div style="font-family:inherit; font-size:12px; padding:2px; max-width:200px; line-height:1.4;">
            ${photoHtml}
            <div style="color:#d97706; font-size:10px; font-weight:bold; text-transform:uppercase;">
              💡 Místo z tipů • ${tip.category_label || tip.category_id || 'Tip'}
            </div>
            <div style="font-weight:bold; font-size:13px; color:#111827; margin-top:2px;">
              ${tip.title}
            </div>
            ${tip.location_name ? `<div style="color:#6b7280; font-size:11px; margin-top:2px;">📍 ${tip.location_name}</div>` : ''}
            ${tip.notes ? `<div style="color:#374151; font-size:11px; margin-top:3px;">${tip.notes}</div>` : ''}
            ${urlHtml}
          </div>
        `);

        const marker = new maplibregl.Marker({ element: tipEl })
          .setLngLat([tip.lng, tip.lat])
          .setPopup(popup)
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    }

    // Fit map bounds to show all markers
    const hasMarkers =
      coordinates.length > 0 ||
      (showAccommodations && filteredAccommodations.length > 0) ||
      (showTips && tips.some((t) => t.lat && t.lng));

    if (hasMarkers && !bounds.isEmpty()) {
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
  }, [
    filteredPois,
    filteredAccommodations,
    showAccommodations,
    onSelectPoi,
    isDarkMode,
    showTips,
    tips,
    selectedCategory,
  ]);

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

        // Casing (outer border)
        map.addLayer({
          id: layerCasingId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': isDarkMode ? '#1e293b' : '#ffffff',
            'line-width': 6,
            'line-opacity': 0.9,
          },
        });

        // Inner line (brand coral)
        map.addLayer({
          id: layerInnerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#d97706',
            'line-width': 3.5,
            'line-dasharray': [1.5, 1.5],
          },
        });
      }
    } catch (err) {
      console.warn('Mapbox polyline render warn:', err);
    }
  }

  return (
    <div className="relative w-full max-w-full h-[calc(100vh-165px)] sm:h-[calc(100vh-116px)] overflow-hidden">
      {/* MapLibre Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Filter Pills Bar */}
      <div className="absolute top-2.5 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-10 flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 no-scrollbar pointer-events-auto max-w-[calc(100vw-1rem)]">
        {/* TOP Only Filter */}
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

        {/* Accommodations Filter Toggle */}
        <button
          onClick={() => setShowAccommodations(!showAccommodations)}
          className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all flex-shrink-0 active:scale-95 ${
            showAccommodations
              ? 'bg-teal-600 text-white ring-2 ring-white dark:ring-stone-800'
              : 'bg-white/95 dark:bg-outdoor-dark-card/95 text-outdoor-text dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-50'
          }`}
          aria-label="Zobrazit ubytování na mapě"
        >
          <Bed className={`w-3.5 h-3.5 ${showAccommodations ? 'fill-white text-white' : 'text-teal-600'}`} />
          <span>🏨 Ubytování ({filteredAccommodations.length})</span>
        </button>

        {/* Tips Filter Toggle - "z tipů" */}
        {onToggleShowTips && tips.length > 0 && (
          <button
            onClick={onToggleShowTips}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all flex-shrink-0 active:scale-95 ${
              showTips
                ? 'bg-amber-500 text-white ring-2 ring-white dark:ring-stone-800'
                : 'bg-white/95 dark:bg-outdoor-dark-card/95 text-outdoor-text dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-50'
            }`}
            aria-label="Filtr zobrazování bodů z tipů na mapě"
            title={showTips ? 'Skrýt místa z tipů na mapě' : 'Zobrazit místa z tipů na mapě'}
          >
            <Lightbulb className={`w-3.5 h-3.5 ${showTips ? 'fill-white text-white' : 'text-amber-500 fill-amber-500'}`} />
            <span>z tipů ({tips.filter((t) => t.lat && t.lng).length || tips.length})</span>
          </button>
        )}

        {/* All categories pill */}
        <button
          onClick={clearCategories}
          className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md transition-all flex-shrink-0 active:scale-95 ${
            selectedCats.length === 0
              ? 'bg-outdoor-teal-dark text-white ring-2 ring-white dark:ring-stone-800'
              : 'bg-white/95 dark:bg-outdoor-dark-card/95 text-outdoor-text dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Všechny ({safePois.length})</span>
        </button>

        {/* Category Pills (Multi-select) */}
        {categories.map((cat) => {
          const count = safePois.filter((p) => p.category_id === cat.id).length;
          const isSelected = selectedCats.includes(cat.id);

          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
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
