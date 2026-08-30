import React, { useState, useEffect } from 'react';
import { FullTrip, POI } from '../types';
import { poiApi } from '../api/client';
import { compressImageFile } from '../utils/imageCompressor';
import {
  MapPin,
  X,
  Camera,
  CheckCircle2,
  ExternalLink,
  Search,
  Loader2,
  Save,
} from 'lucide-react';

interface PoiManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: FullTrip;
  onTripUpdated?: () => Promise<void> | void;
}

interface PoiDraft {
  description: string;
  photoUrl: string;
  lat: string;
  lng: string;
  isSaving: boolean;
  savedRecently: boolean;
  saveError?: string | null;
}

export const PoiManagerModal: React.FC<PoiManagerModalProps> = ({
  isOpen,
  onClose,
  trip,
  onTripUpdated,
}) => {
  const pois = trip.pois || [];
  const days = trip.days || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [drafts, setDrafts] = useState<Record<string, PoiDraft>>({});

  // Initialize or re-sync drafts from POIs when modal opens or trip updates
  useEffect(() => {
    if (!isOpen) return;

    const initialDrafts: Record<string, PoiDraft> = {};
    pois.forEach((p) => {
      initialDrafts[p.id] = {
        description: p.description || '',
        photoUrl: p.main_photo_url || '',
        lat: p.lat !== undefined && p.lat !== null ? String(p.lat) : '',
        lng: p.lng !== undefined && p.lng !== null ? String(p.lng) : '',
        isSaving: false,
        savedRecently: false,
      };
    });
    setDrafts(initialDrafts);
  }, [isOpen, pois]);

  if (!isOpen) return null;

  const updateDraft = (poiId: string, updates: Partial<PoiDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [poiId]: {
        ...(prev[poiId] || {
          description: '',
          photoUrl: '',
          lat: '',
          lng: '',
          isSaving: false,
          savedRecently: false,
        }),
        ...updates,
      },
    }));
  };

  const handlePhotoUpload = async (poiId: string, file: File) => {
    try {
      const compressed = await compressImageFile(file);
      updateDraft(poiId, { photoUrl: compressed, savedRecently: false });
    } catch (err: any) {
      alert(err.message || 'Nepodařilo se zpracovat fotografii.');
    }
  };

  const handleSavePoi = async (poi: POI) => {
    const draft = drafts[poi.id];
    if (!draft) return;

    updateDraft(poi.id, { isSaving: true, saveError: null });

    try {
      const parsedLat = parseFloat(draft.lat);
      const parsedLng = parseFloat(draft.lng);

      const updates: Partial<POI> = {
        description: draft.description.trim() || null,
        main_photo_url: draft.photoUrl.trim() || null,
      };

      if (!isNaN(parsedLat)) {
        updates.lat = parsedLat;
      }
      if (!isNaN(parsedLng)) {
        updates.lng = parsedLng;
      }

      await poiApi.update(trip.id, poi.id, updates);

      updateDraft(poi.id, {
        isSaving: false,
        savedRecently: true,
      });

      if (onTripUpdated) {
        await onTripUpdated();
      }

      setTimeout(() => {
        updateDraft(poi.id, { savedRecently: false });
      }, 2500);
    } catch (err: any) {
      console.error('Chyba při ukládání bodu:', err);
      updateDraft(poi.id, {
        isSaving: false,
        saveError: err.message || 'Chyba při ukládání.',
      });
    }
  };

  // Filter POIs
  const filteredPois = pois.filter((poi) => {
    if (selectedDayFilter !== 'all' && poi.day_id !== selectedDayFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = poi.name.toLowerCase().includes(q);
      const matchDesc = (poi.description || '').toLowerCase().includes(q);
      const day = days.find((d) => d.id === poi.day_id);
      const matchDay = day ? `den ${day.day_number}`.includes(q) : false;
      return matchName || matchDesc || matchDay;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-4xl bg-white dark:bg-outdoor-dark-card rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 flex flex-col max-h-[92vh] overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
                Správa zájmových bodů
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {trip.title} • Celkem {pois.length} bodů na trase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            aria-label="Zavřít správu bodů"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-800 space-y-2.5 shrink-0 bg-white dark:bg-outdoor-dark-card">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat bod podle názvu, popisu nebo dne..."
              className="w-full pl-9 pr-4 py-2 bg-stone-100 dark:bg-stone-800 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white placeholder-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Days Pills filter */}
          {days.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setSelectedDayFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all ${
                  selectedDayFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                Všechny dny ({pois.length})
              </button>
              {days.map((day) => {
                const count = pois.filter((p) => p.day_id === day.id).length;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setSelectedDayFilter(day.id)}
                    className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all ${
                      selectedDayFilter === day.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    Den {day.day_number} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* POI Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredPois.length === 0 ? (
            <div className="text-center py-12 p-6 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700">
              <MapPin className="w-8 h-8 text-stone-400 mx-auto mb-2 opacity-50" />
              <div className="text-xs font-bold text-stone-600 dark:text-stone-300">
                Nebyly nalezeny žádné body zájmu
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Zkuste upravit hledaný výraz nebo vybrat jiný den.
              </p>
            </div>
          ) : (
            filteredPois.map((poi, idx) => {
              const draft = drafts[poi.id] || {
                description: poi.description || '',
                photoUrl: poi.main_photo_url || '',
                lat: poi.lat ? String(poi.lat) : '',
                lng: poi.lng ? String(poi.lng) : '',
                isSaving: false,
                savedRecently: false,
              };

              const day = days.find((d) => d.id === poi.day_id);
              const dayBadge = day ? `Den ${day.day_number}` : 'Bez dne';

              return (
                <div
                  key={poi.id}
                  className="p-4 sm:p-5 bg-white dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-xs space-y-3.5 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-colors"
                >
                  {/* POI Header: Title & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-100 dark:border-stone-700/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-stone-400 dark:text-stone-500">
                        #{idx + 1}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white truncate">
                        {poi.name}
                      </h3>
                      {poi.is_top ? (
                        <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                          ★ TOP
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-semibold">
                        {dayBadge}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold capitalize">
                        {poi.category_id}
                      </span>
                    </div>
                  </div>

                  {/* Form fields: Popis, Foto, Souřadnice */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                    {/* Popis (6 cols on md) */}
                    <div className="md:col-span-6 space-y-1">
                      <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                        Popis bodu zájmu
                      </label>
                      <textarea
                        rows={3}
                        value={draft.description}
                        onChange={(e) =>
                          updateDraft(poi.id, {
                            description: e.target.value,
                            savedRecently: false,
                          })
                        }
                        placeholder="Zadejte popis, praktické informace, historii nebo tipy..."
                        className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white placeholder-stone-400 resize-y"
                      />
                    </div>

                    {/* Vložit foto (3 cols on md) */}
                    <div className="md:col-span-3 space-y-1">
                      <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                        Fotografie
                      </label>

                      {draft.photoUrl ? (
                        <div className="relative group w-full h-20 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-900">
                          <img
                            src={draft.photoUrl}
                            alt={poi.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(poi.id, {
                                photoUrl: '',
                                savedRecently: false,
                              })
                            }
                            className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full text-[10px] transition-colors"
                            title="Odebrat fotografii"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <label className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 text-center">
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Nahrát foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload(poi.id, file);
                              }}
                            />
                          </label>

                          <input
                            type="text"
                            value={draft.photoUrl}
                            onChange={(e) =>
                              updateDraft(poi.id, {
                                photoUrl: e.target.value,
                                savedRecently: false,
                              })
                            }
                            placeholder="Nebo vložte URL fotky..."
                            className="w-full px-2.5 py-1 text-[11px] bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 rounded-lg dark:text-white placeholder-stone-400 truncate"
                          />
                        </div>
                      )}
                    </div>

                    {/* Souřadnice (3 cols on md) */}
                    <div className="md:col-span-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                          GPS Souřadnice
                        </label>
                        {draft.lat && draft.lng && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${draft.lat},${draft.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                            title="Zobrazit na mapě"
                          >
                            <span>Mapa</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <input
                            type="text"
                            value={draft.lat}
                            onChange={(e) =>
                              updateDraft(poi.id, {
                                lat: e.target.value,
                                savedRecently: false,
                              })
                            }
                            placeholder="Šířka (Lat)"
                            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 rounded-xl dark:text-white font-mono"
                          />
                          <span className="text-[9px] text-stone-400 pl-1">Zem. šířka</span>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={draft.lng}
                            onChange={(e) =>
                              updateDraft(poi.id, {
                                lng: e.target.value,
                                savedRecently: false,
                              })
                            }
                            placeholder="Délka (Lng)"
                            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 rounded-xl dark:text-white font-mono"
                          />
                          <span className="text-[9px] text-stone-400 pl-1">Zem. délka</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer of POI card: Save button & Feedback */}
                  <div className="pt-2 flex items-center justify-between border-t border-stone-100 dark:border-stone-700/40">
                    <div className="text-xs">
                      {draft.savedRecently ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold animate-fade-in">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Změny bodu úspěšně uloženy!</span>
                        </span>
                      ) : draft.saveError ? (
                        <span className="text-rose-600 text-xs font-semibold">
                          {draft.saveError}
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400">
                          {poi.address || poi.source_url ? (
                            <span className="truncate max-w-xs block">
                              {poi.address || poi.source_url}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={draft.isSaving}
                      onClick={() => handleSavePoi(poi)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shrink-0 ${
                        draft.savedRecently
                          ? 'bg-emerald-700 text-white shadow-emerald-500/20'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {draft.isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Ukládám...</span>
                        </>
                      ) : draft.savedRecently ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Uloženo ✓</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Uložit</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/40 shrink-0 text-xs">
          <div className="text-stone-500 dark:text-stone-400">
            Zobrazeno {filteredPois.length} z celkem {pois.length} bodů
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-bold rounded-xl transition-colors"
          >
            Hotovo / Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
