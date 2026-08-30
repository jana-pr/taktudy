import React, { useState } from 'react';
import { Trip } from '../types';
import {
  Compass,
  Moon,
  Sun,
  Share2,
  CheckCircle2,
  CloudUpload,
  HardDrive,
  LogOut,
  Plus,
  QrCode,
  Settings,
  SlidersHorizontal,
  ChevronDown,
  Trash2,
  Sparkles,
  Download,
  RefreshCw,
  X,
  Lightbulb,
} from 'lucide-react';

interface NavbarProps {
  trips: Trip[];
  activeTrip: Trip | null;
  onSelectTrip: (trip: Trip) => void;
  onOpenNewTrip: () => void;
  onOpenQuickAdd?: () => void;
  onOpenEditTrip?: () => void;
  onOpenExportForChatGpt?: () => void;
  onOpenEditFromChatGpt?: () => void;
  onDeleteActiveTrip?: () => void;
  onClearAllTrips?: () => void;
  onOpenShare: () => void;
  onOpenOfflineChecklist: () => void;
  onOpenQrModal?: () => void;
  onOpenTips?: () => void;
  onOpenPoiManager?: () => void;
  activeTab?: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing?: boolean;
  onTriggerSync: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  trips,
  activeTrip,
  onSelectTrip,
  onOpenNewTrip,
  onOpenQuickAdd,
  onOpenEditTrip,
  onOpenExportForChatGpt,
  onOpenEditFromChatGpt,
  onDeleteActiveTrip,
  onClearAllTrips,
  onOpenShare,
  onOpenOfflineChecklist,
  onOpenQrModal,
  onOpenTips,
  onOpenPoiManager,
  activeTab,
  isDarkMode,
  onToggleDarkMode,
  pendingSyncCount,
  isSyncing,
  onTriggerSync,
  onLogout,
}) => {
  const [isManageOpen, setIsManageOpen] = useState(false);

  return (
    <div className="w-full max-w-full">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-13 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Logo & Name: "Tak Tudy!" */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-outdoor-teal-dark flex items-center justify-center text-white shadow-xs shrink-0">
            <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-outdoor-coral" />
          </div>
          <div className="min-w-0">
            <span className="font-heading font-extrabold text-sm sm:text-xl tracking-tight text-outdoor-teal-dark dark:text-white hidden min-[400px]:inline">
              Tak Tudy!
            </span>
            <p className="text-[10px] sm:text-xs text-outdoor-text-secondary dark:text-outdoor-dark-secondary truncate hidden sm:block font-medium">
              „Plánuj, abys získal svobodu.“
            </p>
          </div>
        </div>

        {/* Trip Selector Dropdown & "Správa" Menu */}
        <div className="flex-1 min-w-0 mx-1 sm:mx-2 flex items-center gap-1 sm:gap-1.5">
          {trips.length > 0 ? (
            <select
              value={activeTrip?.id || ''}
              onChange={(e) => {
                const found = trips.find((t) => t.id === e.target.value);
                if (found) onSelectTrip(found);
              }}
              aria-label="Výběr aktivní cesty"
              className="flex-1 min-w-0 text-xs font-semibold bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 text-outdoor-text dark:text-outdoor-dark-text focus:outline-none focus:ring-2 focus:ring-outdoor-teal transition-colors truncate"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={onOpenNewTrip}
              className="px-2.5 py-1 sm:py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nová cesta</span>
            </button>
          )}

          {/* "Správa" Dropdown / Modal Menu (export, upravit, nastavit, smazat) */}
          {activeTrip && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsManageOpen(!isManageOpen)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 shrink-0 active:scale-95 ${
                  isManageOpen
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800'
                }`}
                aria-label="Správa cesty"
                title="Správa cesty (export, upravit, nastavit, smazat)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Správa</span>
                <ChevronDown className={`w-3 h-3 hidden sm:inline transition-transform ${isManageOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu / Full mobile overlay */}
              {isManageOpen && (
                <>
                  {/* Backdrop for click outside */}
                  <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
                    onClick={() => setIsManageOpen(false)}
                  />

                  <div className="fixed inset-x-3 top-16 sm:top-auto sm:bottom-auto sm:absolute sm:left-auto sm:right-0 sm:mt-2 max-w-sm sm:w-80 mx-auto bg-white dark:bg-outdoor-dark-card rounded-3xl sm:rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 p-2 z-50 animate-fade-in text-xs max-h-[85vh] overflow-y-auto">
                    {/* Header with Close X */}
                    <div className="px-3.5 py-2.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 truncate pr-2">
                        Správa cesty: <span className="text-stone-900 dark:text-white font-black">{activeTrip.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsManageOpen(false)}
                        className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors shrink-0"
                        aria-label="Zavřít nabídku správy"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 0. Synchronizovat s webem */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsManageOpen(false);
                        onTriggerSync();
                      }}
                      className="w-full px-3.5 py-2.5 text-left bg-teal-50/70 dark:bg-teal-950/50 hover:bg-teal-100/80 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold flex items-center gap-2.5 transition-colors border-b border-stone-100 dark:border-stone-800 rounded-xl"
                    >
                      <RefreshCw className={`w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Synchronizovat s webem</span>
                          {isSyncing && <span className="text-[10px] text-teal-600 animate-pulse">Probíhá...</span>}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">Stáhnout změny z webu / odeslat data</div>
                      </div>
                    </button>

                    {/* Nová cesta (na mobilu přímo v nabídce) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsManageOpen(false);
                        onOpenNewTrip();
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold flex items-center gap-2.5 transition-colors sm:hidden"
                    >
                      <Plus className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <div>
                        <div className="font-bold">Vytvořit novou cestu</div>
                        <div className="text-[10px] text-stone-400 font-normal">Založit prázdnou nebo z ChatGPT</div>
                      </div>
                    </button>

                    {/* 1. Nastavení cesty */}
                    {onOpenEditTrip && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManageOpen(false);
                          onOpenEditTrip();
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold flex items-center gap-2.5 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        <div>
                          <div className="font-bold">Nastavení cesty</div>
                          <div className="text-[10px] text-stone-400 font-normal">Název, motto, termín cesty</div>
                        </div>
                      </button>
                    )}

                    {/* Správa zájmových bodů */}
                    {onOpenPoiManager && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManageOpen(false);
                          onOpenPoiManager();
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold flex items-center gap-2.5 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-bold">Správa zájmových bodů</div>
                          <div className="text-[10px] text-stone-400 font-normal">Editovat popisy, fotografie a GPS souřadnice</div>
                        </div>
                      </button>
                    )}

                    {/* 2. Upravit trasu z ChatGPT */}
                    {onOpenEditFromChatGpt && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManageOpen(false);
                          onOpenEditFromChatGpt();
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold flex items-center gap-2.5 transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <div>
                          <div className="font-bold">Upravit trasu z ChatGPT</div>
                          <div className="text-[10px] text-stone-400 font-normal">Vložit nový prompt / JSON</div>
                        </div>
                      </button>
                    )}

                    {/* 3. Export pro ChatGPT */}
                    {onOpenExportForChatGpt && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManageOpen(false);
                          onOpenExportForChatGpt();
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold flex items-center gap-2.5 transition-colors"
                      >
                        <Download className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div>
                          <div className="font-bold">Export pro ChatGPT</div>
                          <div className="text-[10px] text-stone-400 font-normal">Stáhnout definici nebo zkopírovat JSON</div>
                        </div>
                      </button>
                    )}

                    {/* 4. Sdílet cestu */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsManageOpen(false);
                        onOpenShare();
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold flex items-center gap-2.5 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <div>
                        <div className="font-bold">Sdílet cestu</div>
                        <div className="text-[10px] text-stone-400 font-normal">Odkaz pro přátele a spolucestující</div>
                      </div>
                    </button>

                    {/* 5. Offline kontrola */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsManageOpen(false);
                        onOpenOfflineChecklist();
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold flex items-center gap-2.5 transition-colors"
                    >
                      <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold">Offline kontrola</div>
                        <div className="text-[10px] text-stone-400 font-normal">Ověřit stažení dat pro terén</div>
                      </div>
                    </button>

                    {/* Divider */}
                    <div className="my-1 border-t border-stone-100 dark:border-stone-800" />

                    {/* 6. Smazat cestu */}
                    {onDeleteActiveTrip && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManageOpen(false);
                          onDeleteActiveTrip();
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2.5 transition-colors rounded-xl"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                        <div>
                          <div className="font-bold">Smazat tuto cestu</div>
                          <div className="text-[10px] text-rose-400 font-normal">Nevratně odstranit cestu a její data</div>
                        </div>
                      </button>
                    )}

                    {/* Vymazat všechny cesty (čistý start) */}
                    {onClearAllTrips && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManageOpen(false);
                          onClearAllTrips();
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-rose-600 font-semibold flex items-center gap-2.5 transition-colors rounded-xl mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <div>
                          <div className="font-bold text-[11px]">Vymazat všechny cesty (čistý start)</div>
                          <div className="text-[9px] text-stone-400 font-normal">Smazat historii z webu i telefonu</div>
                        </div>
                      </button>
                    )}

                    {/* Volby zobrazené v menu pouze na mobilu pro uvolnění místa na horní liště */}
                    <div className="my-1 border-t border-stone-100 dark:border-stone-800 sm:hidden" />

                    <button
                      type="button"
                      onClick={() => {
                        onToggleDarkMode();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold flex items-center gap-2.5 transition-colors rounded-xl sm:hidden"
                    >
                      {isDarkMode ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-stone-500 shrink-0" />}
                      <div>
                        <div className="font-bold">{isDarkMode ? 'Denní režim' : 'Tmavý režim'}</div>
                        <div className="text-[10px] text-stone-400 font-normal">Přepnout vzhled aplikace</div>
                      </div>
                    </button>

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManageOpen(false);
                          onLogout();
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-red-500 font-semibold flex items-center gap-2.5 transition-colors rounded-xl sm:hidden"
                      >
                        <LogOut className="w-4 h-4 text-stone-400 shrink-0" />
                        <div>
                          <div className="font-bold">Odhlásit se</div>
                        </div>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* New Trip Button (desktop only) */}
          <button
            onClick={onOpenNewTrip}
            title="Vytvořit novou cestu"
            className="hidden sm:flex p-1 sm:p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 items-center gap-1 text-xs font-semibold transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Nová cesta</span>
          </button>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Správa Tipů – přímo na horní liště obrazovky */}
          {onOpenTips && (
            <button
              type="button"
              onClick={onOpenTips}
              className={`flex items-center gap-1 text-xs font-bold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border transition-all active:scale-95 shrink-0 ${
                activeTab === 'tips'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700/80 shadow-xs'
              }`}
              title="Správa tipů ze světa (zadat nový, upravit, smazat)"
              aria-label="Správa tipů"
            >
              <Lightbulb className={`w-3.5 h-3.5 ${activeTab === 'tips' ? 'text-white' : 'text-amber-500 fill-amber-500'}`} />
              <span className="text-[11px] sm:text-xs">Tipy</span>
            </button>
          )}

          {/* Sync status & Manual sync button */}
          <button
            onClick={onTriggerSync}
            title={
              isSyncing
                ? 'Synchronizuji s webem...'
                : pendingSyncCount > 0
                ? `${pendingSyncCount} neodeslaných změn. Kliknutím synchronizovat s webem.`
                : 'Data jsou aktuální. Kliknutím znovu synchronizovat s webem.'
            }
            className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold p-1 sm:px-2.5 sm:py-1 rounded-full border transition-all active:scale-95 shrink-0 ${
              isSyncing
                ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40'
                : pendingSyncCount > 0
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
            aria-label="Synchronizovat s webem"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Sync...' : pendingSyncCount > 0 ? `${pendingSyncCount}` : 'Sync'}</span>
          </button>

          {/* Mobile QR Code button (hidden on mobile phones) */}
          {onOpenQrModal && (
            <button
              onClick={onOpenQrModal}
              title="Otevřít v mobilu (zobrazit QR kód)"
              className="hidden md:flex px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 items-center gap-1.5 text-xs font-bold transition-all shrink-0"
              aria-label="QR kód pro mobil"
            >
              <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Do mobilu</span>
            </button>
          )}

          {/* Dark mode toggle (desktop only on top bar; mobile in Správa menu) */}
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Přepnout na denní režim' : 'Přepnout na noční režim'}
            className="hidden sm:flex p-1.5 rounded-lg text-outdoor-text-secondary hover:text-outdoor-teal dark:text-stone-300 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
            aria-label="Přepnout motiv vzhledu"
          >
            {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />}
          </button>

          {/* Logout (desktop only on top bar; mobile in Správa menu) */}
          <button
            onClick={onLogout}
            title="Odhlásit se"
            className="hidden sm:flex p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
            aria-label="Odhlásit se"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
