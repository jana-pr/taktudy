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
} from 'lucide-react';

interface PlanViewProps {
  trip: FullTrip;
  onSelectPoi: (poi: POI) => void;
  onToggleVisit: (poiId: string, currentStatus: string) => void;
  onOpenQuickAdd?: () => void;
  onOpenEditTrip?: () => void;
  onAddStage?: (title: string) => Promise<void>;
  onMovePoiStage?: (poiId: string, stageId: string | null) => Promise<void>;
}

export const PlanView: React.FC<PlanViewProps> = ({
  trip,
  onSelectPoi,
  onToggleVisit,
  onOpenQuickAdd,
  onOpenEditTrip,
  onAddStage,
  onMovePoiStage,
}) => {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageTitle, setNewStageTitle] = useState('');
  const [movingPoiId, setMovingPoiId] = useState<string | null>(null);

  const stages = trip?.stages || [];
  const pois = trip?.pois || [];
  // Group days or display sequential list
  const days = (trip?.days && trip.days.length > 0)
    ? trip.days
    : [{ id: 'default_day', trip_id: trip?.id || '', day_number: 1, title: 'Celkový itinerář', has_detail: false, version: 1 }];

  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageTitle.trim() || !onAddStage) return;
    await onAddStage(newStageTitle.trim());
    setNewStageTitle('');
    setIsAddingStage(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Trip Header Banner */}
      <div className="mb-6 bg-white dark:bg-outdoor-dark-card rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-outdoor-coral">
              Itinerář cesty
            </span>
            <h1 className="font-heading font-extrabold text-2xl text-outdoor-text dark:text-white mt-1">
              {trip.title}
            </h1>
            {trip.motto && (
              <p className="text-sm text-outdoor-text-secondary dark:text-stone-300 italic mt-0.5">
                „{trip.motto}“
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onOpenQuickAdd && (
              <button
                onClick={onOpenQuickAdd}
                className="px-3 py-1.5 rounded-xl bg-outdoor-coral hover:bg-outdoor-coral/90 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Přidat bod</span>
              </button>
            )}

            {onOpenEditTrip && (
              <button
                onClick={onOpenEditTrip}
                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-1.5 transition-colors shadow-sm"
                title="Upravit cestu, změnit odkaz na trasu nebo stav"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Upravit trasu</span>
              </button>
            )}
          </div>
        </div>

        {/* Route Link and Stage actions */}
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between flex-wrap gap-2">
          {trip.route_url ? (
            <a
              href={trip.route_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-outdoor-teal/10 hover:bg-outdoor-teal/20 text-outdoor-teal dark:text-outdoor-dark-route text-xs font-bold transition-colors"
            >
              <span>Otevřít celou trasu v Mapy.cz / Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-xs text-stone-400">Trasa se tvoří z vašich bodů</span>
          )}

          {onAddStage && !isAddingStage && (
            <button
              onClick={() => setIsAddingStage(true)}
              className="text-xs text-outdoor-teal font-bold flex items-center gap-1 hover:underline ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Přidat novou etapu</span>
            </button>
          )}
        </div>

        {/* Inline Add Stage Form */}
        {isAddingStage && (
          <form onSubmit={handleStageSubmit} className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
            <input
              type="text"
              required
              autoFocus
              value={newStageTitle}
              onChange={(e) => setNewStageTitle(e.target.value)}
              placeholder="Název etapy (např. Kandy a okolí, Jižní pobřeží...)"
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 dark:bg-stone-800"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-outdoor-teal text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Uložit etapu
            </button>
            <button
              type="button"
              onClick={() => setIsAddingStage(false)}
              className="px-2 py-1.5 text-xs text-stone-500 hover:text-stone-700"
            >
              Zrušit
            </button>
          </form>
        )}
      </div>

      {/* Stages Filter bar if stages exist */}
      {stages.length > 0 && (
        <div className="mb-4 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Etapy cesty
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setSelectedStageId(null)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                selectedStageId === null
                  ? 'bg-outdoor-teal-dark text-white shadow'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              Všechny etapy
            </button>
            {stages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => setSelectedStageId(selectedStageId === stage.id ? null : stage.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                  selectedStageId === stage.id
                    ? 'bg-outdoor-teal-dark text-white shadow'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>{stage.title}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Days Tabs / Chips */}
      {days.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
          <button
            onClick={() => setSelectedDayId(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
              selectedDayId === null
                ? 'bg-outdoor-teal text-white shadow'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            Všechny dny ({pois.length})
          </button>

          {days.map((d) => {
            const count = pois.filter((p) => p.day_id === d.id).length;
            const isSelected = selectedDayId === d.id;

            return (
              <button
                key={d.id}
                onClick={() => setSelectedDayId(isSelected ? null : d.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                  isSelected
                    ? 'bg-outdoor-teal text-white shadow'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                Den {d.day_number} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Itinerary Tree */}
      <div className="space-y-6">
        {days
          .filter((d) => selectedDayId === null || d.id === selectedDayId)
          .map((day) => {
            const dayPois = pois
              .filter((p) => (day.id === 'default_day' ? true : p.day_id === day.id))
              .filter((p) => (selectedStageId ? p.stage_id === selectedStageId : true));

            return (
              <div key={day.id} className="space-y-3">
                {/* Day Header (AC-06, AC-07: chevron only if has_detail is true) */}
                <div className="flex items-center justify-between py-2 border-b border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="bg-outdoor-teal-dark text-white text-xs font-extrabold px-2.5 py-1 rounded-md">
                      DEN {day.day_number}
                    </span>
                    <h2 className="font-heading font-bold text-lg text-outdoor-text dark:text-white">
                      {day.title}
                    </h2>
                  </div>

                  {/* Explicit Affordance Rule */}
                  {day.has_detail ? (
                    <span
                      title="Zobrazit podrobnosti dne"
                      className="text-outdoor-teal dark:text-outdoor-dark-route flex items-center text-xs font-semibold cursor-pointer hover:underline"
                    >
                      Detail dne
                      <ChevronRight className="w-4 h-4 ml-0.5" />
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400 dark:text-stone-500 italic">
                      (bez detailu)
                    </span>
                  )}
                </div>

                {/* POIs in Day */}
                {dayPois.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-stone-50 dark:bg-stone-800/30 border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 text-xs text-center flex flex-col items-center justify-center gap-2.5">
                    <p className="font-medium">V tomto dni zatím nemáš naplánovaná žádná místa.</p>
                    {onOpenQuickAdd && (
                      <button
                        onClick={onOpenQuickAdd}
                        className="px-3.5 py-1.5 bg-outdoor-coral hover:bg-outdoor-coral/90 text-white text-xs font-bold rounded-xl shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Přidat bod sem</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {dayPois.map((poi) => {
                      const isVisited = poi.visit_status === 'visited';
                      const isSkipped = poi.visit_status === 'skipped';

                      return (
                        <div
                          key={poi.id}
                          onClick={() => onSelectPoi(poi)}
                          className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isVisited
                              ? 'bg-stone-50/60 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800 opacity-65'
                              : 'bg-white dark:bg-outdoor-dark-card border-stone-200 dark:border-stone-800 shadow-sm hover:border-outdoor-teal/40 hover:shadow-md'
                          }`}
                        >
                          {/* Visit Status Toggle button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleVisit(poi.id, poi.visit_status);
                            }}
                            className="mt-0.5 text-stone-400 hover:text-outdoor-positive transition-colors flex-shrink-0"
                            title={
                              isVisited
                                ? 'Označeno jako navštíveno (kliknutím zrušit)'
                                : 'Kliknutím označit jako navštíveno'
                            }
                            aria-label={`Stav návštěvy pro ${poi.name}`}
                          >
                            {isVisited ? (
                              <CheckCircle2 className="w-5 h-5 text-outdoor-positive" />
                            ) : isSkipped ? (
                              <EyeOff className="w-5 h-5 text-stone-400" />
                            ) : (
                              <Circle className="w-5 h-5 stroke-stone-300 dark:stroke-stone-600 hover:stroke-outdoor-teal" />
                            )}
                          </button>

                          {/* Time & Title info */}
                          <div className="flex-1 min-w-0">
                            {/* Time badge (Bold for fixed time) */}
                            {poi.time_mode === 'fixed' && poi.target_time && (
                              <div className="flex items-center gap-1 text-outdoor-coral dark:text-outdoor-top font-black text-sm mb-0.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{poi.target_time} — Pevný čas</span>
                              </div>
                            )}

                            {poi.time_mode === 'approximate' && poi.target_time && (
                              <div className="flex items-center gap-1 text-outdoor-text-secondary dark:text-stone-400 text-xs font-semibold mb-0.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>cca {poi.target_time}</span>
                              </div>
                            )}

                            {/* Name + TOP flag */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3
                                className={`font-semibold text-sm sm:text-base leading-tight ${
                                  isVisited
                                    ? 'line-through text-stone-500 dark:text-stone-400'
                                    : 'text-outdoor-text dark:text-white'
                                }`}
                              >
                                {poi.name}
                              </h3>

                              {poi.is_top && (
                                <span className="inline-flex items-center gap-0.5 bg-outdoor-top/10 text-outdoor-top dark:text-outdoor-dark-top text-[11px] font-black px-1.5 py-0.5 rounded border border-outdoor-top/30">
                                  <Star className="w-3 h-3 fill-outdoor-top text-outdoor-top" />
                                  TOP
                                </span>
                              )}
                            </div>

                            {/* Description / Address preview */}
                            {poi.description && (
                              <p className="text-xs text-outdoor-text-secondary dark:text-stone-400 line-clamp-1 mt-1">
                                {poi.description}
                              </p>
                            )}

                            {poi.address && (
                              <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{poi.address}</span>
                              </div>
                            )}

                            {/* Quick Move to Stage dropdown */}
                            {stages.length > 0 && onMovePoiStage && (
                              <div
                                className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Layers className="w-3 h-3 text-stone-400" />
                                <span className="text-[10px] text-stone-400 font-semibold">Etapa:</span>
                                <select
                                  value={poi.stage_id || ''}
                                  onChange={(e) => onMovePoiStage(poi.id, e.target.value || null)}
                                  className="text-[11px] font-medium bg-stone-100 dark:bg-stone-800 rounded px-1.5 py-0.5 border border-stone-200 dark:border-stone-700 text-outdoor-text dark:text-stone-300 focus:ring-1 focus:ring-outdoor-teal"
                                >
                                  <option value="">Bez etapy (celá cesta)</option>
                                  {stages.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          {/* POI Always has detail affordance (AC-05) */}
                          <div className="self-center flex-shrink-0 text-stone-300 group-hover:text-outdoor-teal transition-colors">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
