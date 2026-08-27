import React, { useState, useEffect, useCallback } from 'react';
import { Trip, FullTrip, POI, Category, Tip } from './types';
import { tripsApi, poiApi, categoriesApi, authApi, syncApi, tipsApi } from './api/client';
import { offlineDb } from './offline/db';
import { Navbar } from './components/Navbar';
import { BottomNav, TabType } from './components/BottomNav';
import { OverviewView } from './components/OverviewView';
import { MapView } from './components/MapView';
import { PlanView } from './components/PlanView';
import { AccommodationsView } from './components/AccommodationsView';
import { BookingsView } from './components/BookingsView';
import { BudgetView } from './components/BudgetView';
import { PoiListView } from './components/PoiListView';
import { TodayView } from './components/TodayView';
import { NearMeModal } from './components/NearMeModal';
import { PoiDetailModal } from './components/PoiDetailModal';
import { QuickAddPoiModal } from './components/QuickAddPoiModal';
import { OfflineChecklistModal } from './components/OfflineChecklistModal';
import { ShareModal } from './components/ShareModal';
import { NewTripModal } from './components/NewTripModal';
import { EditTripModal } from './components/EditTripModal';
import { TripProposalModal } from './components/TripProposalModal';
import { RouteOptimizationModal } from './components/RouteOptimizationModal';
import { ImportRouteModal } from './components/ImportRouteModal';
import { MobileAppModal } from './components/MobileAppModal';
import { TipsView } from './components/TipsView';
import { ExportTripModal } from './components/ExportTripModal';
import { EditRouteFromChatGptModal } from './components/EditRouteFromChatGptModal';
import { SharedTripView } from './components/SharedTripView';
import { AuthModal } from './components/AuthModal';
import {
  LayoutDashboard,
  Calendar,
  Map,
  Bed,
  FileText,
  DollarSign,
  Sparkles,
  MapPin,
  Loader2,
  Lightbulb,
} from 'lucide-react';

export function App() {
  // Check URL hash for shared trip
  const [sharedToken, setSharedToken] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/share=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  });

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('taktudy_token'));
  });

  // App Data State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<FullTrip | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [showTipsOnMap, setShowTipsOnMap] = useState(false);
  const [loading, setLoading] = useState(true);

  // Navigation State - defaults to 'overview' for rich trip experience
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedMapDayId, setSelectedMapDayId] = useState<string | null>(null);

  // Filter State for Map
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [onlyTop, setOnlyTop] = useState(false);

  // Modals
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [isNearMeOpen, setIsNearMeOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isEditTripModalOpen, setIsEditTripModalOpen] = useState(false);
  const [isAiProposeOpen, setIsAiProposeOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isOptimizeModalOpen, setIsOptimizeModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditChatGptOpen, setIsEditChatGptOpen] = useState(false);
  const [mapClickCoords, setMapClickCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Theme & Offline Status
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('taktudy_theme') === 'dark';
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Theme sync
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('taktudy_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('taktudy_theme', 'light');
    }
  }, [isDarkMode]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending sync count
  const updatePendingCount = useCallback(async () => {
    const count = await offlineDb.outboxMutations.count();
    setPendingSyncCount(count);
  }, []);

  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // Trigger sync process
  const triggerSync = async () => {
    if (!navigator.onLine) return;
    const res = await syncApi.processOutbox();
    await updatePendingCount();
    if (res.appliedCount > 0 && activeTrip) {
      // Refresh current trip
      const refreshed = await tripsApi.get(activeTrip.id);
      setActiveTrip(refreshed);
    }
  };

  // Reload current active trip
  const refreshActiveTrip = async () => {
    if (!activeTrip) return;
    try {
      const refreshed = await tripsApi.get(activeTrip.id);
      setActiveTrip(refreshed);
    } catch (err) {
      console.error('Chyba při obnově cesty:', err);
    }
  };

  // Load Trips and Categories
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tripsData, catsData, tipsData] = await Promise.all([
        tripsApi.list(),
        categoriesApi.list().catch(() => []),
        tipsApi.getAll().catch(() => []),
      ]);

      setTrips(tripsData);
      setCategories(catsData);
      setTips(tipsData);

      if (tripsData.length > 0) {
        // Find Sri Lanka 2026 trip if available or take first
        const sriLankaTrip = tripsData.find((t) => t.id === 'trip_srilanka_2026');
        const defaultTrip = sriLankaTrip || tripsData[0];
        const full = await tripsApi.get(defaultTrip.id);
        setActiveTrip(full);
      }
    } catch (err) {
      console.error('Chyba načítání dat:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !sharedToken) {
      loadData();
    }
  }, [isAuthenticated, sharedToken, loadData]);

  // If share token is present in hash, show public read-only view
  if (sharedToken) {
    return (
      <SharedTripView
        shareToken={sharedToken}
        onExitShare={() => {
          window.location.hash = '';
          setSharedToken(null);
        }}
      />
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <AuthModal
        onSuccess={() => {
          setIsAuthenticated(true);
          loadData();
        }}
        onAuthSuccess={() => {
          setIsAuthenticated(true);
          loadData();
        }}
      />
    );
  }

  const handleSelectTrip = async (trip: Trip) => {
    try {
      setLoading(true);
      const full = await tripsApi.get(trip.id);
      setActiveTrip(full);
    } catch (err) {
      console.error('Chyba při načítání cesty:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (data: {
    title: string;
    motto?: string;
    status?: any;
    startDate?: string;
    endDate?: string;
    routeUrl?: string;
  }) => {
    const created = await tripsApi.create(data);
    await loadData();
    const full = await tripsApi.get(created.id);
    setActiveTrip(full);
    setActiveTab('overview');
  };

  const handleTripCreatedFromAiOrImport = async (tripId: string) => {
    await loadData();
    try {
      const full = await tripsApi.get(tripId);
      setActiveTrip(full);
      setActiveTab('overview');
    } catch (err) {
      console.error('Chyba při otevření vytvořené cesty:', err);
    }
  };

  const handleUpdateTrip = async (data: Partial<Trip>) => {
    if (!activeTrip) return;
    await tripsApi.update(activeTrip.id, data);
    await loadData();
    const refreshed = await tripsApi.get(activeTrip.id);
    setActiveTrip(refreshed);
  };

  const handleDuplicateTrip = async () => {
    if (!activeTrip) return;
    const res = await tripsApi.duplicate(activeTrip.id);
    await loadData();
    const full = await tripsApi.get(res.id);
    setActiveTrip(full);
  };

  const handleDeleteTrip = async (tripIdToDelete?: string) => {
    const targetId = tripIdToDelete || activeTrip?.id;
    if (!targetId) return;

    const targetTrip = trips.find((t) => t.id === targetId) || activeTrip;
    const tripTitle = targetTrip?.title || 'tuto cestu';

    if (!confirm(`Opravdu chcete smazat cestu „${tripTitle}“? Všechny dny a body zájmu v této cestě budou odstraněny.`)) {
      return;
    }

    try {
      setLoading(true);
      await tripsApi.delete(targetId);
      const remainingTrips = await tripsApi.getAll();
      setTrips(remainingTrips);
      if (remainingTrips.length > 0) {
        const next = await tripsApi.get(remainingTrips[0].id);
        setActiveTrip(next);
      } else {
        setActiveTrip(null);
      }
    } catch (err: any) {
      alert(err.message || 'Nepodařilo se smazat cestu.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStage = async (title: string) => {
    if (!activeTrip) return;
    await tripsApi.addStage(activeTrip.id, { title });
    const refreshed = await tripsApi.get(activeTrip.id);
    setActiveTrip(refreshed);
  };

  const handleMovePoiStage = async (poiId: string, stageId: string | null) => {
    if (!activeTrip) return;
    await poiApi.update(activeTrip.id, poiId, { stage_id: stageId });
    const refreshed = await tripsApi.get(activeTrip.id);
    setActiveTrip(refreshed);
  };

  const handleToggleTop = async (poiId: string, currentTop: boolean) => {
    if (!activeTrip) return;
    await poiApi.update(activeTrip.id, poiId, { is_top: !currentTop });
    const refreshed = await tripsApi.get(activeTrip.id);
    setActiveTrip(refreshed);
  };

  const handleToggleVisit = async (poiId: string, currentStatus: string) => {
    if (!activeTrip) return;
    const nextStatus = currentStatus === 'visited' ? 'unvisited' : 'visited';
    await poiApi.update(activeTrip.id, poiId, { visit_status: nextStatus as any });
    const refreshed = await tripsApi.get(activeTrip.id);
    setActiveTrip(refreshed);
  };

  const handleDeletePoi = async (poiId: string) => {
    if (!activeTrip) return;
    await poiApi.delete(activeTrip.id, poiId);
    setSelectedPoi(null);
    const refreshed = await tripsApi.get(activeTrip.id);
    setActiveTrip(refreshed);
  };

  const handleSavePoiEdit = async (poiId: string, updates: Partial<POI>) => {
    if (!activeTrip) return;
    await poiApi.update(activeTrip.id, poiId, updates);
    const refreshed = await tripsApi.get(activeTrip.id);
    setActiveTrip(refreshed);
    if (selectedPoi && selectedPoi.id === poiId) {
      setSelectedPoi({ ...selectedPoi, ...updates });
    }
  };

  const handleAddPoi = async (poiData: Partial<POI>) => {
    if (!activeTrip) return;
    await poiApi.create(activeTrip.id, poiData);
    setIsQuickAddOpen(false);
    setMapClickCoords(null);
    const refreshed = await tripsApi.get(activeTrip.id);
    setActiveTrip(refreshed);
  };

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setMapClickCoords(coords);
    setIsQuickAddOpen(true);
  };

  const handleOpenExternalNav = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleLogout = () => {
    authApi.logout();
    setIsAuthenticated(false);
    setTrips([]);
    setActiveTrip(null);
  };

  if (loading && !activeTrip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-outdoor-bg dark:bg-outdoor-dark-bg">
        <Loader2 className="w-8 h-8 text-outdoor-teal animate-spin mb-3" />
        <p className="text-sm font-semibold text-outdoor-text dark:text-stone-300">
          Načítám Tak tudy!...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-stone-50 dark:bg-gray-900 transition-colors ${isDarkMode ? 'dark' : ''}`}>
      {/* Top Navbar */}
      <Navbar
        trips={trips}
        activeTrip={activeTrip}
        onSelectTrip={handleSelectTrip}
        onOpenNewTrip={() => setIsNewTripModalOpen(true)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenEditTrip={() => setIsEditTripModalOpen(true)}
        onDeleteActiveTrip={() => handleDeleteTrip()}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenOfflineChecklist={() => setIsOfflineModalOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onTriggerSync={triggerSync}
        onLogout={handleLogout}
      />

      {/* Sub-Header Tabs (Section 15: Přehled | Itinerář | Mapa | Ubytování | Rezervace | Rozpočet + Dnes) */}
      {activeTrip && (
        <div className="sticky top-14 sm:top-16 z-30 w-full max-w-full overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-12 flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full">
            {/* 6 Main Tabs */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Přehled</span>
              </button>

              <button
                onClick={() => setActiveTab('plan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'plan'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Itinerář</span>
              </button>

              <button
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'map'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Mapa</span>
              </button>

              <button
                onClick={() => setActiveTab('accommodations')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'accommodations'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Ubytování</span>
              </button>

              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'bookings'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Rezervace</span>
              </button>

              <button
                onClick={() => setActiveTab('budget')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'budget'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Rozpočet</span>
              </button>

              <button
                onClick={() => setActiveTab('tips')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'tips'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Zásobárna tipů</span>
              </button>

              <button
                onClick={() => setActiveTab('pois')}
                className={`hidden md:flex px-3 py-1.5 rounded-xl text-xs font-bold transition-all items-center gap-1.5 ${
                  activeTab === 'pois'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Místa ({activeTrip.pois?.length || 0})</span>
              </button>
            </div>

            {/* Prominent "Dnes" button (Section 16) */}
            <div className="shrink-0">
              <button
                onClick={() => setActiveTab('today')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm ${
                  activeTab === 'today'
                    ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                    : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>DNES</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden relative">
        {activeTrip ? (
          <div className="w-full max-w-full overflow-x-hidden h-full">
            {activeTab === 'overview' && (
              <div className="p-4 sm:p-6">
                <OverviewView
                  trip={activeTrip}
                  onSelectDay={(dayId) => {
                    setActiveTab('plan');
                    setTimeout(() => {
                      const el = document.getElementById(`day-${dayId}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  onNavigateToPoi={setSelectedPoi}
                  onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                  onOpenExportForChatGpt={() => setIsExportModalOpen(true)}
                  onOpenEditFromChatGpt={() => setIsEditChatGptOpen(true)}
                  onOpenEditTrip={() => setIsEditTripModalOpen(true)}
                  onDeleteTrip={() => handleDeleteTrip()}
                />
              </div>
            )}

            {activeTab === 'plan' && (
              <PlanView
                trip={activeTrip}
                onSelectPoi={setSelectedPoi}
                onToggleVisit={handleToggleVisit}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                onOpenEditTrip={() => setIsEditTripModalOpen(true)}
                onOpenOptimize={() => setIsOptimizeModalOpen(true)}
                onAddStage={handleAddStage}
                onMovePoiStage={handleMovePoiStage}
                onTripUpdated={refreshActiveTrip}
              />
            )}

            {activeTab === 'map' && (
              <MapView
                pois={activeTrip.pois || []}
                categories={categories}
                days={activeTrip.days || []}
                accommodations={activeTrip.accommodations || []}
                tips={tips}
                showTips={showTipsOnMap}
                onToggleShowTips={() => setShowTipsOnMap(!showTipsOnMap)}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                selectedDayId={selectedMapDayId}
                onSelectDayId={setSelectedMapDayId}
                onlyTop={onlyTop}
                onToggleOnlyTop={() => setOnlyTop(!onlyTop)}
                onSelectPoi={setSelectedPoi}
                onMapClick={handleMapClick}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'accommodations' && (
              <div className="p-4 sm:p-6">
                <AccommodationsView
                  trip={activeTrip}
                  onTripUpdated={refreshActiveTrip}
                />
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="p-4 sm:p-6">
                <BookingsView
                  trip={activeTrip}
                  onTripUpdated={refreshActiveTrip}
                />
              </div>
            )}

            {activeTab === 'budget' && (
              <div className="p-4 sm:p-6">
                <BudgetView
                  trip={activeTrip}
                  onTripUpdated={refreshActiveTrip}
                />
              </div>
            )}

            {activeTab === 'pois' && (
              <div className="p-4 sm:p-6 max-w-4xl mx-auto">
                <PoiListView
                  pois={activeTrip.pois || []}
                  categories={categories}
                  onSelectPoi={setSelectedPoi}
                  onToggleTop={handleToggleTop}
                  onToggleVisit={handleToggleVisit}
                  onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                />
              </div>
            )}

            {activeTab === 'today' && (
              <div className="p-4 sm:p-6 max-w-3xl mx-auto">
                <TodayView
                  trip={activeTrip}
                  onSelectPoi={setSelectedPoi}
                  onOpenExternalNavigation={handleOpenExternalNav}
                />
              </div>
            )}

            {activeTab === 'tips' && (
              <TipsView
                activeTrip={activeTrip}
                onNavigateToMap={(lat, lng) => {
                  setActiveTab('map');
                }}
                onTripUpdated={refreshActiveTrip}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            Zatím nemáš žádnou cestu. Vytvoř novou cestu.
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop) */}
      <div className="lg:hidden">
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onQuickAdd={() => setIsQuickAddOpen(true)}
          onOpenNearMe={() => setIsNearMeOpen(true)}
        />
      </div>

      {/* Modals */}
      <PoiDetailModal
        poi={selectedPoi}
        categories={categories}
        stages={activeTrip?.stages}
        days={activeTrip?.days}
        isOpen={Boolean(selectedPoi)}
        onClose={() => setSelectedPoi(null)}
        onToggleTop={handleToggleTop}
        onToggleVisit={handleToggleVisit}
        onDeletePoi={handleDeletePoi}
        onSaveEdit={handleSavePoiEdit}
      />

      <NearMeModal
        pois={activeTrip ? activeTrip.pois : []}
        categories={categories}
        isOpen={isNearMeOpen}
        onClose={() => setIsNearMeOpen(false)}
        onSelectPoi={setSelectedPoi}
      />

      {activeTrip && (
        <QuickAddPoiModal
          tripId={activeTrip.id}
          categories={categories}
          isOpen={isQuickAddOpen}
          onClose={() => {
            setIsQuickAddOpen(false);
            setMapClickCoords(null);
          }}
          onAddPoi={handleAddPoi}
          initialCoords={mapClickCoords}
        />
      )}

      {activeTrip && (
        <OfflineChecklistModal
          trip={activeTrip}
          isOpen={isOfflineModalOpen}
          onClose={() => setIsOfflineModalOpen(false)}
          isOnline={isOnline}
        />
      )}

      {activeTrip && (
        <ShareModal
          trip={activeTrip}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      <NewTripModal
        isOpen={isNewTripModalOpen}
        onClose={() => setIsNewTripModalOpen(false)}
        onCreateTrip={handleCreateTrip}
        onOpenAiPropose={() => setIsAiProposeOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onTripImported={handleTripCreatedFromAiOrImport}
      />

      {activeTrip && (
        <EditTripModal
          trip={activeTrip}
          isOpen={isEditTripModalOpen}
          onClose={() => setIsEditTripModalOpen(false)}
          onUpdateTrip={handleUpdateTrip}
          onDuplicateTrip={handleDuplicateTrip}
          onDeleteTrip={handleDeleteTrip}
          onTripUpdated={refreshActiveTrip}
        />
      )}

      {/* AI Proposal Modal */}
      <TripProposalModal
        isOpen={isAiProposeOpen}
        onClose={() => setIsAiProposeOpen(false)}
        onTripCreated={handleTripCreatedFromAiOrImport}
      />

      {/* Route Optimization Modal */}
      {activeTrip && (
        <RouteOptimizationModal
          isOpen={isOptimizeModalOpen}
          onClose={() => setIsOptimizeModalOpen(false)}
          tripId={activeTrip.id}
          onApplyOptimization={refreshActiveTrip}
        />
      )}

      {/* Route Import Modal (GPX, KML, JSON) */}
      <ImportRouteModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onTripImported={handleTripCreatedFromAiOrImport}
      />

      {/* Mobile App QR Code Modal */}
      <MobileAppModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* Export Trip for ChatGPT Modal (Požadavek 3) */}
      <ExportTripModal
        trip={activeTrip}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Edit Route from ChatGPT Modal (Požadavek 2) */}
      <EditRouteFromChatGptModal
        trip={activeTrip}
        isOpen={isEditChatGptOpen}
        onClose={() => setIsEditChatGptOpen(false)}
        onTripUpdated={refreshActiveTrip}
      />
    </div>
  );
}
export default App;
