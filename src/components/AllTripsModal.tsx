import React, { useState, useMemo, useRef } from 'react';
import { Trip, TripStatus } from '../types';
import { sortTrips, formatTripDateRange, getTripStatusInfo } from '../utils/tripSort';
import { tripsApi, MAX_TRIPS_LIMIT } from '../api/client';
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
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

interface AllTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  activeTrip: Trip | null;
  onSelectTrip: (trip: Trip) => void;
  onOpenNewTrip: () => void;
  onUpdateTripStatus?: (tripId: string, status: TripStatus) => Promise<void>;
  onDeleteTrip?: (tripId: string) => void;
  onClearAllTrips?: () => void;
  onRefreshData?: () => Promise<void>;
}

export const AllTripsModal: React.FC<AllTripsModalProps> = ({
  isOpen,
  onClose,
  trips,
  activeTrip,
  onSelectTrip,
  onOpenNewTrip,
  onUpdateTripStatus,
  onDeleteTrip,
  onClearAllTrips,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const isNearingLimit = trips.length >= 25;
  const isLimitReached = trips.length >= MAX_TRIPS_LIMIT;

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const jsonText = await tripsApi.exportAllBackupJson();
      const blob = new Blob([jsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const nowStr = new Date().toISOString().split('T')[0];
      const a = document.createElement('a');
      a.href = url;
      a.download = `taktudy-zaloha-tras-${nowStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ Kompletní záloha všech tras byla úspěšně stažena!');
    } catch (err: any) {
      alert(err.message || 'Nepodařilo se exportovat zálohu.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const res = await tripsApi.restoreFromBackupJson(text);
        if (onRefreshData) await onRefreshData();
        showToast(`✅ Obnoveno ${res.count} tras ze záložního souboru!`);
      } catch (err: any) {
        alert(err.message || 'Chyba při obnově ze souboru zálohy.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      alert('Nepodařilo se přečíst soubor.');
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const handleDeleteCompletedTrips = async () => {
    const completedTrips = trips.filter((t) => t.status === 'completed' || t.status === 'archived');
    if (completedTrips.length === 0) {
      alert('Nemáte žádné dokončené trasy k promazání.');
      return;
    }

    if (!confirm(`Opravdu chcete smazat všech ${completedTrips.length} dokončených tras a uvolnit místo?`)) {
      return;
    }

    try {
      for (const t of completedTrips) {
        if (onDeleteTrip) onDeleteTrip(t.id);
      }
      if (onRefreshData) await onRefreshData();
      showToast(`🧹 Smazáno ${completedTrips.length} dokončených tras.`);
    } catch (err) {
      console.error('Chyba při mazání dokončených tras:', err);
    }
  };

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
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-stone-800 dark:text-white">
                  Přehled všech cest
                </h2>
                {/* Trip count badge */}
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${
                    isLimitReached
                      ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                      : isNearingLimit
                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
                  }`}
                  title={`Aktuálně uloženo ${trips.length} z maximálních ${MAX_TRIPS_LIMIT} tras`}
                >
                  {trips.length} / {MAX_TRIPS_LIMIT} tras
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Seřazeno chronologicky podle termínů s dokončenými cestami na konci
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Backup JSON Button */}
            <button
              type="button"
              disabled={isExporting || trips.length === 0}
              onClick={handleExportBackup}
              className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center gap-1.5 transition-all border border-stone-200 dark:border-stone-700"
              title="Stáhnout kompletní zálohu všech tras do jednoho JSON souboru"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
              <span className="hidden md:inline">Zálohovat</span>
            </button>

            {/* Restore JSON Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
              id="restore-json-input"
            />
            <button
              type="button"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs flex items-center gap-1.5 transition-all border border-stone-200 dark:border-stone-700"
              title="Obnovit trasy ze souboru zálohy JSON"
            >
              {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
              <span className="hidden md:inline">Obnovit</span>
            </button>

            {/* Clean Completed Trips Button */}
            {stats.completed > 0 && (
              <button
                type="button"
                onClick={handleDeleteCompletedTrips}
                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-200 dark:border-amber-800"
                title={`Smazat ${stats.completed} dokončených tras a uvolnit kapacitu`}
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Úklid ({stats.completed})</span>
              </button>
            )}

            {onClearAllTrips && trips.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClearAllTrips();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-rose-200 dark:border-rose-800"
                title="Vymazat všechny cesty a začít s čistým štítem"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden md:inline">Vymazat vše</span>
              </button>
            )}

            <button
              type="button"
              disabled={isLimitReached}
              onClick={() => {
                if (isLimitReached) {
                  alert(`Byl dosažen limit ${MAX_TRIPS_LIMIT} tras. Před vytvořením nové cesty prosím promažte staré nebo dokončené cesty.`);
                  return;
                }
                onClose();
                onOpenNewTrip();
              }}
              className={`px-3 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                isLimitReached ? 'bg-stone-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'
              }`}
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

        {/* Action toast message */}
        {actionMessage && (
          <div className="px-5 py-2.5 bg-teal-600 text-white text-xs font-bold flex items-center justify-between animate-fade-in shadow-inner">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-white/80 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Capacity Warning Banner if >= 25 trips */}
        {isNearingLimit && (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Máte uloženo <strong>{trips.length} z {MAX_TRIPS_LIMIT} tras</strong>. Doporučujeme promazat staré nebo dokončené cesty, případně si stáhnout zálohu do JSON souboru.
              </span>
            </div>
            {stats.completed > 0 && (
              <button
                type="button"
                onClick={handleDeleteCompletedTrips}
                className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-bold shrink-0 ml-2"
              >
                Promazat dokončené ({stats.completed})
              </button>
            )}
          </div>
        )}

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
                              Vybraná
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

                      {onDeleteTrip && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTrip(trip.id);
                          }}
                          title={`Smazat cestu „${trip.title}“`}
                          className="p-1.5 rounded-xl border border-transparent hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
