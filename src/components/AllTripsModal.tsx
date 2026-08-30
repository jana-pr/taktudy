import React, { useState, useMemo } from 'react';
import { Trip, TripStatus } from '../types';
import { sortTrips, formatTripDateRange, getTripStatusInfo } from '../utils/tripSort';
import {
  X,
  Calendar,
  Compass,
  Plus,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  Search,
  Check,
  CalendarRange,
  ExternalLink,
} from 'lucide-react';

interface AllTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  activeTrip: Trip | null;
  onSelectTrip: (trip: Trip) => void;
  onOpenNewTrip: () => void;
  onUpdateTripStatus?: (tripId: string, status: TripStatus) => Promise<void>;
}

export const AllTripsModal: React.FC<AllTripsModalProps> = ({
  isOpen,
  onClose,
  trips,
  activeTrip,
  onSelectTrip,
  onOpenNewTrip,
  onUpdateTripStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);

  // Sorted list: Active/Planning chronologically closest first, completed at the bottom
  const sortedTrips = useMemo(() => {
    return sortTrips(trips);
  }, [trips]);

  const filteredTrips = useMemo(() => {
    return sortedTrips.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.country_region && t.country_region.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.motto && t.motto.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      const isCompleted = t.status === 'completed' || t.status === 'archived';
      if (statusFilter === 'active') return !isCompleted;
      if (statusFilter === 'completed') return isCompleted;
      return true;
    });
  }, [sortedTrips, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = trips.length;
    const completed = trips.filter((t) => t.status === 'completed' || t.status === 'archived').length;
    const active = total - completed;
    return { total, active, completed };
  }, [trips]);

  if (!isOpen) return null;

  const handleToggleCompleted = async (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateTripStatus) return;

    try {
      setUpdatingTripId(trip.id);
      const newStatus: TripStatus = trip.status === 'completed' ? 'planning' : 'completed';
      await onUpdateTripStatus(trip.id, newStatus);
    } catch (err) {
      console.error('Chyba při změně stavu cesty:', err);
    } finally {
      setUpdatingTripId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-outdoor-dark-card w-full sm:max-w-4xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-white dark:bg-outdoor-dark-card">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-stone-800 dark:text-white">
                Přehled všech cest
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Seřazeno chronologicky podle termínů s dokončenými cestami na konci
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewTrip();
              }}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nová cesta</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
              aria-label="Zavřít"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Stats Bar */}
        <div className="p-3 sm:px-5 sm:py-3 bg-stone-50/80 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Hledat podle názvu nebo destinace..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-stone-800 dark:text-stone-200"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300/60'
              }`}
            >
              Vše ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'active'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300/60'
              }`}
            >
              Plánované & aktivní ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'completed'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300/60'
              }`}
            >
              Dokončené ({stats.completed})
            </button>
          </div>
        </div>

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {filteredTrips.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              Žádné cesty neodpovídají zadanému filtru.
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Desktop Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                <div className="col-span-5">Název cesty & Destinace</div>
                <div className="col-span-3">Termín výletu</div>
                <div className="col-span-2">Stav cesty</div>
                <div className="col-span-2 text-right">Akce</div>
              </div>

              {filteredTrips.map((trip) => {
                const isActive = activeTrip?.id === trip.id;
                const statusInfo = getTripStatusInfo(trip.status);
                const dateRangeText = formatTripDateRange(trip.start_date, trip.end_date);
                const isCompleted = trip.status === 'completed' || trip.status === 'archived';

                return (
                  <div
                    key={trip.id}
                    onClick={() => {
                      onSelectTrip(trip);
                      onClose();
                    }}
                    className={`group p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2.5 sm:gap-3 ${
                      isActive
                        ? 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700/60 shadow-xs'
                        : isCompleted
                        ? 'bg-stone-50/50 dark:bg-stone-900/30 border-stone-200/70 dark:border-stone-800/60 opacity-80 hover:opacity-100 hover:border-teal-200'
                        : 'bg-white dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:border-teal-300 hover:shadow-xs'
                    }`}
                  >
                    {/* 1. Column: Title & Destination */}
                    <div className="sm:col-span-5 flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? 'bg-teal-600 text-white'
                            : isCompleted
                            ? 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                            : 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200'
                        }`}
                      >
                        <Compass className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-xs sm:text-sm text-stone-900 dark:text-white truncate">
                            {trip.title}
                          </h3>
                          {isActive && (
                            <span className="text-[9px] font-extrabold bg-teal-600 text-white px-1.5 py-0.2 rounded-md shrink-0">
                              Aktivní
                            </span>
                          )}
                        </div>
                        {trip.country_region && (
                          <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium truncate mt-0.5">
                            📍 {trip.country_region}
                          </div>
                        )}
                        {trip.motto && (
                          <div className="text-[10px] text-stone-400 dark:text-stone-400 truncate italic">
                            „{trip.motto}“
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Column: Termín výletu */}
                    <div className="sm:col-span-3 flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{dateRangeText}</span>
                    </div>

                    {/* 3. Column: Stav cesty */}
                    <div className="sm:col-span-2 flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusInfo.dotClass}`} />
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* 4. Column: Akce */}
                    <div className="sm:col-span-2 flex items-center justify-end gap-1.5 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                      {onUpdateTripStatus && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleCompleted(trip, e)}
                          disabled={updatingTripId === trip.id}
                          title={isCompleted ? 'Označit jako rozpracovanou' : 'Označit jako dokončenou'}
                          className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                            isCompleted
                              ? 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="text-[10px]">
                            {isCompleted ? 'Znovu otevřít' : 'Dokončit'}
                          </span>
                        </button>
                      )}

                      <div className="p-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-1 group-hover:bg-teal-600 group-hover:text-white transition-all">
                        <span className="text-[11px] hidden sm:inline">Otevřít</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
