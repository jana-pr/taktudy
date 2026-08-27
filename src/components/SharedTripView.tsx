import React, { useState, useEffect } from 'react';
import { FullTrip, POI, Category } from '../types';
import { shareApi, categoriesApi } from '../api/client';
import { MapView } from './MapView';
import { PlanView } from './PlanView';
import { PoiListView } from './PoiListView';
import { PoiDetailModal } from './PoiDetailModal';
import { Compass, Map, Calendar, MapPin, AlertCircle, Loader2 } from 'lucide-react';

interface SharedTripViewProps {
  shareToken: string;
  onExitShare: () => void;
}

export const SharedTripView: React.FC<SharedTripViewProps> = ({ shareToken, onExitShare }) => {
  const [trip, setTrip] = useState<FullTrip | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'map' | 'plan' | 'pois'>('map');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [onlyTop, setOnlyTop] = useState(false);
  const [detailPoi, setDetailPoi] = useState<POI | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const loadSharedData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tripData, cats] = await Promise.all([
          shareApi.getSharedTrip(shareToken),
          categoriesApi.list().catch(() => []),
        ]);
        setTrip(tripData);
        setCategories(cats);
      } catch (err: any) {
        setError(err.message || 'Sdílenou cestu se nepodařilo načíst.');
      } finally {
        setLoading(false);
      }
    };

    loadSharedData();
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-outdoor-bg dark:bg-outdoor-dark-bg p-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-outdoor-teal mb-3" />
        <p className="font-heading font-bold text-outdoor-text dark:text-white">
          Načítám sdílenou cestu...
        </p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-outdoor-bg dark:bg-outdoor-dark-bg p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-outdoor-text dark:text-white">
          Cesta není dostupná
        </h1>
        <p className="text-xs text-stone-500 max-w-sm mt-1 mb-4">
          {error || 'Odkaz ke sdílení již není platný nebo byl autorem zrušen.'}
        </p>
        <button
          onClick={onExitShare}
          className="px-4 py-2 bg-outdoor-teal text-white text-xs font-bold rounded-xl"
        >
          Přejít na hlavní stránku
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-outdoor-bg dark:bg-outdoor-dark-bg ${isDarkMode ? 'dark' : ''}`}>
      {/* Read-Only Top Banner */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-outdoor-dark-card/95 backdrop-blur border-b border-stone-200 dark:border-stone-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-outdoor-teal flex items-center justify-center text-white">
            <Compass className="w-5 h-5 text-outdoor-coral" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-sm text-outdoor-text dark:text-white leading-tight truncate max-w-[200px] sm:max-w-xs">
              {trip.title}
            </h1>
            <span className="text-[10px] text-outdoor-teal font-bold uppercase tracking-wider">
              Sdílená cesta · Pouze pro čtení
            </span>
          </div>
        </div>

        {/* Tab switchers in header */}
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'map' ? 'bg-white dark:bg-outdoor-teal text-outdoor-text dark:text-white shadow-sm' : 'text-stone-500'
            }`}
          >
            Mapa
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'plan' ? 'bg-white dark:bg-outdoor-teal text-outdoor-text dark:text-white shadow-sm' : 'text-stone-500'
            }`}
          >
            Plán
          </button>
          <button
            onClick={() => setActiveTab('pois')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'pois' ? 'bg-white dark:bg-outdoor-teal text-outdoor-text dark:text-white shadow-sm' : 'text-stone-500'
            }`}
          >
            Místa ({trip.pois.length})
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full">
        {activeTab === 'map' && (
          <MapView
            pois={trip.pois}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onlyTop={onlyTop}
            onToggleOnlyTop={() => setOnlyTop(!onlyTop)}
            onSelectPoi={setDetailPoi}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === 'plan' && (
          <PlanView
            trip={trip}
            onSelectPoi={setDetailPoi}
            onToggleVisit={() => {}}
          />
        )}

        {activeTab === 'pois' && (
          <PoiListView
            pois={trip.pois}
            categories={categories}
            onSelectPoi={setDetailPoi}
            onToggleTop={() => {}}
            onToggleVisit={() => {}}
          />
        )}
      </main>

      {/* Detail Modal (Read Only) */}
      <PoiDetailModal
        poi={detailPoi}
        categories={categories}
        isOpen={Boolean(detailPoi)}
        onClose={() => setDetailPoi(null)}
        onToggleTop={() => {}}
        onToggleVisit={() => {}}
        onDeletePoi={() => {}}
        onSaveEdit={() => {}}
        isReadOnly={true}
      />
    </div>
  );
};
