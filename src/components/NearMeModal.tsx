import React, { useState, useEffect } from 'react';
import { POI, Category } from '../types';
import { X, Navigation, Star, ChevronRight, Compass } from 'lucide-react';

interface NearMeModalProps {
  pois: POI[];
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSelectPoi: (poi: POI) => void;
}

// Client-side Haversine formula (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const NearMeModal: React.FC<NearMeModalProps> = ({
  pois,
  categories,
  isOpen,
  onClose,
  onSelectPoi,
}) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [onlyTop, setOnlyTop] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (!navigator.geolocation) {
      // Fallback for simulation / devices without GPS: use Kandy coordinates
      setUserLocation({ lat: 7.2906, lng: 80.6337 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        // Fallback for demo when permission denied or offline
        setUserLocation({ lat: 7.2906, lng: 80.6337 });
        setLocError('GPS poloha není dostupná, zobrazuji vzdálenosti od referenčního středu cesty.');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate distances to unvisited POIs
  const poisWithDist = (pois || [])
    .filter((p) => p.visit_status === 'unvisited')
    .filter((p) => (onlyTop ? p.is_top : true))
    .filter((p) => (selectedCategory ? p.category_id === selectedCategory : true))
    .map((p) => {
      const dist = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) : 0;
      return { ...p, distanceKm: dist };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-outdoor-dark-card w-full sm:max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-outdoor-teal/10 text-outdoor-teal">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg text-outdoor-text dark:text-white">
                Co mám poblíž?
              </h2>
              <p className="text-xs text-outdoor-text-secondary dark:text-stone-400">
                Nenavštívená místa v tvém okolí
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Zavřít"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-900/40 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setOnlyTop(!onlyTop)}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 transition-all ${
              onlyTop
                ? 'bg-outdoor-top text-white shadow'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyTop ? 'fill-white' : 'fill-outdoor-top text-outdoor-top'}`} />
            <span>Pouze TOP</span>
          </button>

          <button
            onClick={() => setSelectedCategory(null)}
            className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 transition-all ${
              selectedCategory === null
                ? 'bg-outdoor-teal-dark text-white shadow'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
            }`}
          >
            Všechny kategorie
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
              className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 transition-all ${
                selectedCategory === c.id
                  ? 'bg-outdoor-teal-dark text-white shadow'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}
            >
              {c.label_cs.split('/')[0].trim()}
            </button>
          ))}
        </div>

        {locError && (
          <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px]">
            {locError}
          </div>
        )}

        {/* List of nearby POIs */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {poisWithDist.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-sm">
              Žádná nenavštívená místa poblíž neodpovídají filtrům.
            </div>
          ) : (
            poisWithDist.map((poi) => (
              <div
                key={poi.id}
                onClick={() => {
                  onSelectPoi(poi);
                  onClose();
                }}
                className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 shadow-sm hover:border-outdoor-teal/40 cursor-pointer transition-all"
              >
                {/* Distance Badge */}
                <div className="w-14 h-14 rounded-xl bg-outdoor-teal/10 dark:bg-outdoor-teal/20 text-outdoor-teal dark:text-outdoor-dark-route flex flex-col items-center justify-center flex-shrink-0 font-heading font-black">
                  <span className="text-sm leading-none">
                    {poi.distanceKm < 1 ? Math.round(poi.distanceKm * 1000) : poi.distanceKm.toFixed(1)}
                  </span>
                  <span className="text-[10px] font-bold uppercase mt-0.5">
                    {poi.distanceKm < 1 ? 'm' : 'km'}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-sm text-outdoor-text dark:text-white">
                      {poi.name}
                    </h3>
                    {poi.is_top && (
                      <span className="text-[10px] font-black text-outdoor-top bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">
                        ★ TOP
                      </span>
                    )}
                  </div>

                  {poi.description && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {poi.description}
                    </p>
                  )}
                </div>

                <ChevronRight className="w-5 h-5 text-stone-300 flex-shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
