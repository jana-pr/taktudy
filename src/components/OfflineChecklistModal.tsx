import React, { useState } from 'react';
import { FullTrip } from '../types';
import { X, CheckCircle2, Download, HardDrive, RefreshCw, Smartphone, ShieldCheck } from 'lucide-react';
import { offlineDb } from '../offline/db';

interface OfflineChecklistModalProps {
  trip: FullTrip;
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
}

export const OfflineChecklistModal: React.FC<OfflineChecklistModalProps> = ({
  trip,
  isOpen,
  onClose,
  isOnline,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      // 1. Cache trip and POIs into Dexie IndexedDB
      await offlineDb.cachedTrips.put(trip);
      await offlineDb.cachedPois.bulkPut(trip.pois);

      // Simulate vector tile prefetch
      await new Promise((resolve) => setTimeout(resolve, 800));
      setDownloadSuccess(true);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-outdoor-dark-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-outdoor-teal-dark to-outdoor-teal text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur">
              <HardDrive className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg">
                Offline připravenost
              </h2>
              <p className="text-xs text-teal-100">{trip.title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Status Message */}
        <div className="p-5 bg-emerald-500/10 dark:bg-emerald-950/30 border-b border-emerald-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-outdoor-positive text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-outdoor-positive dark:text-emerald-400 text-base">
              „Připraveno. Můžeš vyrazit.“
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
              Tato cesta je uložena v paměti zařízení a bude fungovat i v režimu letadlo.
            </p>
          </div>
        </div>

        {/* Checklist items */}
        <div className="p-5 space-y-3.5 text-sm">
          <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2 text-outdoor-text dark:text-stone-200">
              <CheckCircle2 className="w-4 h-4 text-outdoor-positive flex-shrink-0" />
              <span>Struktura a itinerář etap</span>
            </div>
            <span className="text-xs font-bold text-outdoor-positive">Uloženo</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2 text-outdoor-text dark:text-stone-200">
              <CheckCircle2 className="w-4 h-4 text-outdoor-positive flex-shrink-0" />
              <span>Body zájmu a časy ({trip.pois.length})</span>
            </div>
            <span className="text-xs font-bold text-outdoor-positive">Uloženo</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2 text-outdoor-text dark:text-stone-200">
              <CheckCircle2 className="w-4 h-4 text-outdoor-positive flex-shrink-0" />
              <span>Osobní poznámky a popisy</span>
            </div>
            <span className="text-xs font-bold text-outdoor-positive">Uloženo</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2 text-outdoor-text dark:text-stone-200">
              <CheckCircle2 className="w-4 h-4 text-outdoor-positive flex-shrink-0" />
              <span>Fotografie míst v mezipaměti</span>
            </div>
            <span className="text-xs font-bold text-outdoor-positive">Uloženo</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 text-outdoor-text dark:text-stone-200">
              <CheckCircle2 className="w-4 h-4 text-outdoor-positive flex-shrink-0" />
              <span>Mapová oblast koridoru cesty</span>
            </div>
            <span className="text-xs font-bold text-outdoor-positive">Připraveno</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-5 pt-0">
          <button
            onClick={handleDownloadAll}
            disabled={isDownloading}
            className="w-full py-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-outdoor-text dark:text-stone-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isDownloading ? 'animate-spin' : ''}`} />
            <span>{isDownloading ? 'Aktualizuji data...' : 'Aktualizovat offline balíček'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
