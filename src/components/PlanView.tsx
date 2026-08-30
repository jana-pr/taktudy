import React, { useState } from 'react';
import { FullTrip, POI, Day, Stage } from '../types';
import {
  ChevronRight,
  Clock,
  Star,
  CheckCircle2,
  Circle,
  EyeOff,
  MapPin,
  ExternalLink,
  Plus,
  Layers,
  Settings,
  ArrowRightLeft,
  Navigation,
  Compass,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Bed,
} from 'lucide-react';
import { tripsApi } from '../api/client';

interface PlanViewProps {
  trip: FullTrip;
  onSelectPoi: (poi: POI) => void;
  onToggleVisit: (poiId: string, currentStatus: string) => void;
  onOpenQuickAdd?: () => void;
  onOpenEditTrip?: () => void;
  onOpenOptimize?: () => void;
  onAddStage?: (title: string) => Promise<void>;
  onMovePoiStage?: (poiId: string, stageId: string | null) => Promise<void>;
  onTripUpdated?: () => void;
}

export const PlanView: React.FC<PlanViewProps> = ({
  trip,
  onSelectPoi,
  onToggleVisit,
  onOpenQuickAdd,
  onOpenEditTrip,
  onOpenOptimize,
  onAddStage,
  onMovePoiStage,
  onTripUpdated,
}) => {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [movingPoiId, setMovingPoiId] = useState<string | null>(null);
  const [selectedSafariPark, setSelectedSafariPark] = useState<string>('Minneriya National Park');

  const days = trip?.days || [];
  const pois = trip?.pois || [];
  const accommodations = trip?.accommodations || [];

  // Toggle optional activity enabled state
  const handleToggleOptional = async (e: React.MouseEvent, poi: POI) => {
    e.stopPropagation();
    try {
      await tripsApi.togglePoiEnabled(trip.id, poi.id, !poi.is_enabled);
      if (onTripUpdated) onTripUpdated();
    } catch (err) {
      console.error('Chyba při přepnutí volitelného bodu:', err);
    }
  };

  // Move POI to another day
  const handleMovePoiDay = async (poiId: string, targetDayId: string) => {
    try {
      await tripsApi.reorderPois(trip.id, [{ id: poiId, sort_order: 99, day_id: targetDayId }]);
      setMovingPoiId(null);
      if (onTripUpdated) onTripUpdated();
    } catch (err) {
      console.error('Chyba při přesunu bodu na jiný den:', err);
    }
  };

  // Move POI up/down within day
  const handleReorderPoi = async (dayPois: POI[], index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= dayPois.length) return;

    const reordered = [...dayPois];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const payload = reordered.map((p, i) => ({
      id: p.id,
      sort_order: i + 1,
      day_id: p.day_id || undefined,
    }));

    try {
      await tripsApi.reorderPois(trip.id, payload);
      if (onTripUpdated) onTripUpdated();
    } catch (err) {
      console.error('Chyba při změně pořadí bodů:', err);
    }
  };

  // Open Google Maps driving route for a day
  const openGoogleMapsDay = (dayPois: POI[], startLoc?: string | null, endLoc?: string | null) => {
    if (dayPois.length === 0 && !startLoc) return;

    const origin = startLoc ? encodeURIComponent(startLoc) : `${dayPois[0]?.lat},${dayPois[0]?.lng}`;
    const destination = endLoc
      ? encodeURIComponent(endLoc)
      : `${dayPois[dayPois.length - 1]?.lat},${dayPois[dayPois.length - 1]?.lng}`;

    // Google Maps supports max ~9 waypoints per URL
    const waypoints = dayPois
      .slice(startLoc ? 0 : 1, endLoc ? dayPois.length : dayPois.length - 1)
      .slice(0, 8)
      .map((p) => `${p.lat},${p.lng}`)
      .join('|');

    const url = waypoints
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Denní itinerář cesty
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-0.5">
              {trip.title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Celkem {days.length} dní • {pois.length} zájmových míst • Volitelná i povinná místa
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onOpenQuickAdd && (
              <button
                onClick={onOpenQuickAdd}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Přidat bod</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Days Loop */}
      <div className="space-y-6">
        {days.map((day) => {
          const dayPois = pois.filter((p) => p.day_id === day.id).sort((a, b) => a.sort_order - b.sort_order);
          const dayHotel = accommodations.find((a) => a.day_id === day.id);

          return (
            <div
              key={day.id}
              id={`day-${day.id}`}
              className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4"
            >
              {/* Day Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200">
                      DEN {day.day_number}
                    </span>
                    {day.specific_date && (
                      <span>
                        {new Date(day.specific_date).toLocaleDateString('cs-CZ', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'numeric',
                        })}
                      </span>
                    )}
                    {day.recommended_departure && (
                      <span className="text-gray-400">• Odjezd: {day.recommended_departure}</span>
                    )}
                  </div>

                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
                    {day.title}
                  </h2>

                  {/* Route Bar: Start -> Dest */}
                  {(day.start_location || day.overnight_location) && (
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 mt-1.5 py-1 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl w-fit">
                      <span className="text-teal-600 dark:text-teal-400 font-bold">{day.start_location || 'Start'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{day.overnight_location || 'Cíl'}</span>
                      {day.distance_km ? <span className="text-gray-400">({day.distance_km} km)</span> : null}
                      {day.transit_time_est ? <span className="text-gray-400">⏱ {day.transit_time_est}</span> : null}
                    </div>
                  )}
                </div>

                {/* Day Navigation Action */}
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => openGoogleMapsDay(dayPois, day.start_location, day.overnight_location)}
                    className="px-3.5 py-2 bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Otevřít trasu v Google Maps</span>
                  </button>
                </div>
              </div>

              {/* Special Parallel Transit: Day 9 (3. 1.) - pouze pro staré demo Srí Lanka */}
              {trip.id === 'trip_srilanka_2026' && day.day_number === 9 && (
                <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl text-xs space-y-2">
                  <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <span>🚆 Souběžný paralelní přesun:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-blue-950 dark:text-blue-100">
                    <div className="p-2.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-blue-100 dark:border-blue-900">
                      <strong>My (cestující):</strong> Vyhlídkový vlak Nanu Oya → Ella (scénická jízda přes hory).
                    </div>
                    <div className="p-2.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-blue-100 dark:border-blue-900">
                      <strong>Řidič (auto + kufry):</strong> Převeze hlavní zavazadla autem a čeká na nádraží v Ella.
                    </div>
                  </div>
                </div>
              )}

              {/* Special Safari Selector: Day 3 (28. 12.) - pouze pro staré demo Srí Lanka */}
              {trip.id === 'trip_srilanka_2026' && day.day_number === 3 && (
                <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs space-y-2">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                    <span>🐘 Odpolední Safari – Výběr na místě podle pohybu slonů:</span>
                    <span className="text-[10px] bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                      VOLBA NA MÍSTĚ
                    </span>
                  </div>
                  <p className="text-amber-800 dark:text-amber-300">
                    Vybereme pouze <strong>JEDNU</strong> variantu podle ranní zprávy rangerů:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                    {['Minneriya National Park', 'Kaudulla National Park', 'Hurulu Eco Park'].map((park) => (
                      <button
                        key={park}
                        type="button"
                        onClick={() => setSelectedSafariPark(park)}
                        className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                          selectedSafariPark === park
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-amber-200 dark:border-amber-900/50 hover:border-amber-400'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{park}</div>
                        <div className="text-[10px] opacity-80 mt-0.5">
                          {selectedSafariPark === park ? '✓ Zvoleno' : 'Kliknout pro výběr'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* POIs List */}
              <div className="space-y-3">
                {dayPois.map((poi, idx) => {
                  const isMandatory = poi.is_mandatory !== false;
                  const isEnabled = poi.is_enabled !== false;

                  return (
                    <div
                      key={poi.id}
                      onClick={() => onSelectPoi(poi)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isMandatory
                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:border-teal-400'
                          : isEnabled
                          ? 'bg-purple-50/40 dark:bg-purple-950/20 border-dashed border-purple-300 dark:border-purple-800/60 hover:border-purple-400'
                          : 'bg-gray-50 dark:bg-gray-800/40 border-dashed border-gray-200 dark:border-gray-700 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Left: Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Mandatory / Optional Badge */}
                            {isMandatory ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white shadow-xs">
                                ★ POVINNÉ MÍSTO
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                                VOLITELNÉ MÍSTO
                              </span>
                            )}

                            {poi.is_top && (
                              <span className="text-amber-500 font-bold text-xs flex items-center gap-0.5">
                                <Star className="w-3.5 h-3.5 fill-amber-500" /> TOP
                              </span>
                            )}

                            {poi.data_origin === 'ai_completed' && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                <Sparkles className="w-2.5 h-2.5" /> Doplněno AI
                              </span>
                            )}

                            {poi.data_origin === 'needs_completion' && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 px-2 py-0.5 rounded-full font-medium">
                                Je třeba doplnit
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            {poi.name}
                          </h3>

                          {poi.why_visit && (
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              <strong>Proč tam jet:</strong> {poi.why_visit}
                            </p>
                          )}

                          {poi.private_notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                              Poznámka: {poi.private_notes}
                            </p>
                          )}
                        </div>

                        {/* Right: Actions & Details */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                          {/* Duration & Cost */}
                          <div className="flex items-center gap-2 text-xs">
                            {poi.recommended_duration && (
                              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {poi.recommended_duration}
                              </span>
                            )}
                            {poi.cost_est ? (
                              <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg">
                                ${poi.cost_est}
                              </span>
                            ) : null}
                          </div>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-1">
                            {/* Toggle switch for optional activities */}
                            {!isMandatory && (
                              <button
                                type="button"
                                onClick={(e) => handleToggleOptional(e, poi)}
                                className="p-1 text-teal-600 dark:text-teal-400 hover:scale-105 transition-transform"
                                title={isEnabled ? 'Vypnout z rozpočtu a programu' : 'Zapnout do rozpočtu'}
                              >
                                {isEnabled ? (
                                  <ToggleRight className="w-6 h-6" />
                                ) : (
                                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                                )}
                              </button>
                            )}

                            {/* Move up / down within day */}
                            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReorderPoi(dayPois, idx, 'up');
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                                title="Posunout nahoru"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === dayPois.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReorderPoi(dayPois, idx, 'down');
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                                title="Posunout dolů"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Move to another day dropdown toggle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMovingPoiId(movingPoiId === poi.id ? null : poi.id);
                              }}
                              className="p-1.5 text-gray-500 hover:text-teal-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                              title="Přesunout na jiný den"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Navigate in Google Maps button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}`,
                                  '_blank'
                                );
                              }}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-teal-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:text-teal-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Navigovat v Google Maps"
                            >
                              <Navigation className="w-3 h-3 text-teal-600" />
                              <span>Navigovat</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Move to another day selector popover */}
                      {movingPoiId === poi.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 rounded-xl text-xs space-y-2 animate-fade-in"
                        >
                          <div className="font-bold text-gray-800 dark:text-gray-200">
                            Přesunout místo „{poi.name}“ na jiný den:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {days.map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                disabled={d.id === poi.day_id}
                                onClick={() => handleMovePoiDay(poi.id, d.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                  d.id === poi.day_id
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-white dark:bg-gray-800 hover:bg-teal-50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                                }`}
                              >
                                Den {d.day_number}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hotel bar at the bottom */}
              {dayHotel && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <Bed className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Ubytování na noc: <strong>{dayHotel.hotel_name}</strong></span>
                  </div>
                  {dayHotel.booking_url && (
                    <a
                      href={dayHotel.booking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      Booking.com <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
