import React, { useState, useEffect, useCallback } from 'react';
import { Trip, FullTrip, POI, Category } from './types';
import { tripsApi, poiApi, categoriesApi, authApi, syncApi } from './api/client';
import { offlineDb } from './offline/db';
import { Navbar } from './components/Navbar';
import { BottomNav, TabType } from './components/BottomNav';
import { MapView } from './components/MapView';
import { PlanView } from './components/PlanView';
import { PoiListView } from './components/PoiListView';
import { TodayView } from './components/TodayView';
import { NearMeModal } from './components/NearMeModal';
import { PoiDetailModal } from './components/PoiDetailModal';
import { QuickAddPoiModal } from './components/QuickAddPoiModal';
import { OfflineChecklistModal } from './components/OfflineChecklistModal';
import { ShareModal } from './components/ShareModal';
import { NewTripModal } from './components/NewTripModal';
import { EditTripModal } from './components/EditTripModal';
import { SharedTripView } from './components/SharedTripView';
import { AuthModal } from './components/AuthModal';
import { Loader2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('map');

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

  // Load Trips and Categories
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tripsData, catsData] = await Promise.all([
        tripsApi.list(),
        categoriesApi.list().catch(() => []),
      ]);

      setTrips(tripsData);
      setCategories(catsData);

      if (tripsData.length > 0) {
        const full = await tripsApi.get(tripsData[0].id);
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

  // If not logged in, show Auth
  if (!isAuthenticated) {
    return (
      <AuthModal
        onSuccess={() => {
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // Switch trip
  const handleSelectTrip = async (trip: Trip) => {
    setLoading(true);
    try {
      const full = await tripsApi.get(trip.id);
      setActiveTrip(full);
    } finally {
      setLoading(false);
    }
  };

  // POI Operations
  const handleToggleTop = async (poiId: string) => {
    if (!activeTrip) return;
    const target = activeTrip.pois.find((p) => p.id === poiId);
    if (!target) return;

    // Optimistic UI update
    const nextTop = !target.is_top;
    setActiveTrip({
      ...activeTrip,
      pois: activeTrip.pois.map((p) => (p.id === poiId ? { ...p, is_top: nextTop } : p)),
    });

    if (selectedPoi && selectedPoi.id === poiId) {
      setSelectedPoi({ ...selectedPoi, is_top: nextTop });
    }

    try {
      await poiApi.toggleTop(activeTrip.id, poiId);
    } catch {
      await poiApi.update(activeTrip.id, poiId, { is_top: nextTop });
      await updatePendingCount();
    }
  };

  const handleToggleVisit = async (poiId: string, currentStatus: string) => {
    if (!activeTrip) return;
    const nextStatus = currentStatus === 'visited' ? 'unvisited' : 'visited';

    setActiveTrip({
      ...activeTrip,
      pois: activeTrip.pois.map((p) => (p.id === poiId ? { ...p, visit_status: nextStatus } : p)),
    });

    if (selectedPoi && selectedPoi.id === poiId) {
      setSelectedPoi({ ...selectedPoi, visit_status: nextStatus });
    }

    try {
      await poiApi.updateVisitStatus(activeTrip.id, poiId, nextStatus);
    } catch {
      await poiApi.update(activeTrip.id, poiId, { visit_status: nextStatus });
      await updatePendingCount();
    }
  };

  const handleDeletePoi = async (poiId: string) => {
    if (!activeTrip) return;
    setActiveTrip({
      ...activeTrip,
      pois: activeTrip.pois.filter((p) => p.id !== poiId),
    });
    await poiApi.delete(activeTrip.id, poiId);
    await updatePendingCount();
  };

  const handleSavePoiEdit = async (poiId: string, updatedData: Partial<POI>) => {
    if (!activeTrip) return;
    setActiveTrip({
      ...activeTrip,
      pois: activeTrip.pois.map((p) => (p.id === poiId ? { ...p, ...updatedData } : p)),
    });
    if (selectedPoi && selectedPoi.id === poiId) {
      setSelectedPoi({ ...selectedPoi, ...updatedData });
    }
    await poiApi.update(activeTrip.id, poiId, updatedData);
    await updatePendingCount();
  };

  const handleAddPoi = async (poiData: Partial<POI>) => {
    if (!activeTrip) return;
    const created = await poiApi.create(activeTrip.id, poiData);
    setActiveTrip({
      ...activeTrip,
      pois: [...activeTrip.pois, created],
    });
    await updatePendingCount();
  };

  const handleOpenExternalNav = (poi: POI) => {
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const url = isIos
      ? `maps://?q=${encodeURIComponent(poi.name)}&ll=${poi.lat},${poi.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`;
    window.open(url, '_blank');
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
    const updatedTrips = await tripsApi.list();
    setTrips(updatedTrips);
    const full = await tripsApi.get(created.id);
    setActiveTrip(full);
  };

  const handleUpdateTrip = async (tripId: string, data: Partial<FullTrip>) => {
    await tripsApi.update(tripId, data);
    const updatedTrips = await tripsApi.list();
    setTrips(updatedTrips);
    const full = await tripsApi.get(tripId);
    setActiveTrip(full);
  };

  const handleDeleteTrip = async (tripId: string) => {
    await tripsApi.delete(tripId);
    const updatedTrips = await tripsApi.list();
    setTrips(updatedTrips);
    if (updatedTrips.length > 0) {
      const nextTrip = await tripsApi.get(updatedTrips[0].id);
      setActiveTrip(nextTrip);
    } else {
      setActiveTrip(null);
    }
  };

  const handleDuplicateTrip = async (tripId: string) => {
    const res = await tripsApi.duplicate(tripId);
    const updatedTrips = await tripsApi.list();
    setTrips(updatedTrips);
    const full = await tripsApi.get(res.id);
    setActiveTrip(full);
  };

  const handleAddStage = async (title: string) => {
    if (!activeTrip) return;
    await tripsApi.addStage(activeTrip.id, { title });
    const full = await tripsApi.get(activeTrip.id);
    setActiveTrip(full);
  };

  const handleMovePoiStage = async (poiId: string, stageId: string | null) => {
    if (!activeTrip) return;
    await poiApi.update(activeTrip.id, poiId, { stage_id: stageId });
    const full = await tripsApi.get(activeTrip.id);
    setActiveTrip(full);
    await updatePendingCount();
  };

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setMapClickCoords(coords);
    setIsQuickAddOpen(true);
  };

  const handleLogout = () => {
    authApi.logout();
    setIsAuthenticated(false);
  };

  if (loading && !activeTrip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-outdoor-bg dark:bg-outdoor-dark-bg p-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-outdoor-teal mb-3" />
        <p className="font-heading font-bold text-outdoor-text dark:text-white">
          Načítám tvé cesty...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-outdoor-bg dark:bg-outdoor-dark-bg transition-colors ${isDarkMode ? 'dark' : ''}`}>
      {/* Top Navbar */}
      <Navbar
        trips={trips}
        activeTrip={activeTrip}
        onSelectTrip={handleSelectTrip}
        onOpenNewTrip={() => setIsNewTripModalOpen(true)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenOfflineChecklist={() => setIsOfflineModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onTriggerSync={triggerSync}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative">
        {activeTrip ? (
          <>
            {/* Desktop 2-column or Multi-view layout */}
            <div className="hidden lg:grid lg:grid-cols-12 h-[calc(100vh-4rem)]">
              {/* Left Context Side: Plan & Today tabs */}
              <div className="lg:col-span-5 h-full overflow-y-auto border-r border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-outdoor-dark-card/50">
                <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('plan')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'plan' ? 'bg-outdoor-teal text-white shadow' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Plán a dny
                  </button>
                  <button
                    onClick={() => setActiveTab('today')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'today' ? 'bg-outdoor-coral text-white shadow' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Režim Dnes
                  </button>
                  <button
                    onClick={() => setActiveTab('pois')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'pois' ? 'bg-outdoor-teal text-white shadow' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Seznam bodů ({activeTrip.pois?.length || 0})
                  </button>
                </div>

                {activeTab === 'today' ? (
                  <TodayView
                    trip={activeTrip}
                    onSelectPoi={setSelectedPoi}
                    onOpenExternalNavigation={handleOpenExternalNav}
                  />
                ) : activeTab === 'pois' ? (
                  <PoiListView
                    pois={activeTrip.pois || []}
                    categories={categories}
                    onSelectPoi={setSelectedPoi}
                    onToggleTop={handleToggleTop}
                    onToggleVisit={handleToggleVisit}
                    onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                  />
                ) : (
                  <PlanView
                    trip={activeTrip}
                    onSelectPoi={setSelectedPoi}
                    onToggleVisit={handleToggleVisit}
                    onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                    onOpenEditTrip={() => setIsEditTripModalOpen(true)}
                    onAddStage={handleAddStage}
                    onMovePoiStage={handleMovePoiStage}
                  />
                )}
              </div>

              {/* Right Side: Dominant Map View */}
              <div className="lg:col-span-7 h-full relative">
                <MapView
                  pois={activeTrip.pois || []}
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onlyTop={onlyTop}
                  onToggleOnlyTop={() => setOnlyTop(!onlyTop)}
                  onSelectPoi={setSelectedPoi}
                  onMapClick={handleMapClick}
                  onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>

            {/* Mobile View (Tab-based for iPhone 12 mini) */}
            <div className="lg:hidden w-full">
              {activeTab === 'map' && (
                <MapView
                  pois={activeTrip.pois || []}
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onlyTop={onlyTop}
                  onToggleOnlyTop={() => setOnlyTop(!onlyTop)}
                  onSelectPoi={setSelectedPoi}
                  onMapClick={handleMapClick}
                  onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                  isDarkMode={isDarkMode}
                />
              )}

              {activeTab === 'plan' && (
                <PlanView
                  trip={activeTrip}
                  onSelectPoi={setSelectedPoi}
                  onToggleVisit={handleToggleVisit}
                  onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                  onOpenEditTrip={() => setIsEditTripModalOpen(true)}
                  onAddStage={handleAddStage}
                  onMovePoiStage={handleMovePoiStage}
                />
              )}

              {activeTab === 'pois' && (
                <PoiListView
                  pois={activeTrip.pois || []}
                  categories={categories}
                  onSelectPoi={setSelectedPoi}
                  onToggleTop={handleToggleTop}
                  onToggleVisit={handleToggleVisit}
                  onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                />
              )}

              {activeTab === 'today' && (
                <TodayView
                  trip={activeTrip}
                  onSelectPoi={setSelectedPoi}
                  onOpenExternalNavigation={handleOpenExternalNav}
                />
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-stone-400">
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
      />

      <EditTripModal
        trip={activeTrip}
        isOpen={isEditTripModalOpen}
        onClose={() => setIsEditTripModalOpen(false)}
        onUpdateTrip={handleUpdateTrip}
        onDuplicateTrip={handleDuplicateTrip}
        onDeleteTrip={handleDeleteTrip}
      />
    </div>
  );
}
export default App;
