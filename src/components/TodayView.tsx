import React from 'react';
import { FullTrip, POI } from '../types';
import { Clock, Star, MapPin, Navigation, Compass, ChevronRight, CheckCircle2 } from 'lucide-react';

interface TodayViewProps {
  trip: FullTrip;
  onSelectPoi: (poi: POI) => void;
  onOpenExternalNavigation: (poi: POI) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  trip,
  onSelectPoi,
  onOpenExternalNavigation,
}) => {
  const days = trip?.days || [];
  const pois = trip?.pois || [];

  // Use day 4 or first day as active demo day for "Dnes"
  const currentDay = days.find((d) => d.day_number === 4) || days[0] || {
    id: 'today_fallback',
    trip_id: trip?.id || '',
    day_number: 1,
    title: 'Dnešní program',
    has_detail: false,
    version: 1,
  };

  const todayPois = pois.filter((p) => (currentDay.id !== 'today_fallback' ? p.day_id === currentDay.id : true));

  // Find next critical fixed time POI
  const nextCriticalPoi = todayPois.find((p) => p.time_mode === 'fixed' && p.visit_status === 'unvisited');
  const otherPois = todayPois.filter((p) => p.id !== nextCriticalPoi?.id);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 space-y-4 sm:space-y-5 w-full max-w-full overflow-x-hidden">
      {/* Context Card */}
      <div className="bg-gradient-to-br from-outdoor-teal-dark to-outdoor-teal text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="bg-white/20 backdrop-blur text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              Režim Dnes v terénu
            </span>
            <span className="text-xs font-semibold text-teal-100">
              Den {currentDay.day_number}
            </span>
          </div>

          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl mt-2 leading-tight">
            {currentDay.title}
          </h1>

          <p className="text-xs sm:text-sm text-teal-100 mt-1">
            {trip.title}
          </p>
        </div>

        {/* Decorative subtle compass water-mark */}
        <Compass className="absolute -right-6 -bottom-6 w-36 h-36 text-white/5 pointer-events-none" />
      </div>

      {/* Critical Next Event Card (Prominent Fixed Time countdown) */}
      {nextCriticalPoi ? (
        <div className="bg-white dark:bg-outdoor-dark-card border-2 border-outdoor-coral/40 dark:border-outdoor-coral/50 rounded-2xl p-5 shadow-sm relative">
          <div className="flex items-center justify-between text-xs font-bold text-outdoor-coral mb-2">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 animate-spin-slow" />
              <span>ČASOVĚ KRITICKÁ UDÁLOST</span>
            </span>
            {nextCriticalPoi.is_top && (
              <span className="flex items-center gap-1 bg-outdoor-coral/10 text-outdoor-coral px-2 py-0.5 rounded-md font-black">
                ★ TOP
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-black text-outdoor-text dark:text-white font-heading">
                {nextCriticalPoi.target_time}
              </div>
              <h2 className="text-lg font-bold text-outdoor-text dark:text-stone-100 mt-0.5">
                {nextCriticalPoi.name}
              </h2>
              {nextCriticalPoi.description && (
                <p className="text-xs text-outdoor-text-secondary dark:text-stone-300 mt-1 line-clamp-2">
                  {nextCriticalPoi.description}
                </p>
              )}
            </div>

            {nextCriticalPoi.main_photo_url && (
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-800 shadow">
                <img
                  src={nextCriticalPoi.main_photo_url}
                  alt={nextCriticalPoi.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
            <button
              onClick={() => onOpenExternalNavigation(nextCriticalPoi)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-outdoor-teal hover:bg-outdoor-teal-dark active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>Spustit navigaci</span>
            </button>

            <button
              onClick={() => onSelectPoi(nextCriticalPoi)}
              className="py-2.5 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 text-outdoor-text dark:text-stone-200 font-semibold text-xs transition-all"
            >
              Detail místa
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-outdoor-positive/10 border border-outdoor-positive/20 rounded-2xl p-4 text-xs text-outdoor-positive dark:text-emerald-400 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>Všechny časově pevné události pro dnešek máš za sebou. Čas na volný průzkum!</span>
        </div>
      )}

      {/* Other Today POIs */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-outdoor-text-secondary dark:text-stone-400">
          Další dnešní zastávky ({otherPois.length})
        </h3>

        {otherPois.map((poi) => (
          <div
            key={poi.id}
            onClick={() => onSelectPoi(poi)}
            className="flex items-center gap-3.5 p-3.5 bg-white dark:bg-outdoor-dark-card border border-stone-200 dark:border-stone-800 rounded-xl shadow-sm hover:border-outdoor-teal/40 cursor-pointer transition-all group"
          >
            {poi.main_photo_url && (
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100">
                <img src={poi.main_photo_url} alt={poi.name} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-semibold text-sm text-outdoor-text dark:text-stone-100">
                  {poi.name}
                </h4>
                {poi.is_top && (
                  <span className="text-[10px] font-black text-outdoor-top bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">
                    ★ TOP
                  </span>
                )}
              </div>

              {poi.target_time && (
                <div className="text-xs text-stone-500 dark:text-stone-400 font-medium flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-stone-400" />
                  <span>{poi.target_time}</span>
                </div>
              )}
            </div>

            <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-outdoor-teal transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
};
