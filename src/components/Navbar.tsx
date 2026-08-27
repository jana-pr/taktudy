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
  onOpenShare: () => void;
  onOpenOfflineChecklist: () => void;
  onOpenQrModal?: () => void;
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
  onOpenShare,
  onOpenOfflineChecklist,
  onOpenQrModal,
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
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-outdoor-teal-dark flex items-center justify-center text-white shadow-xs shrink-0">
            <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-outdoor-coral" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-heading font-extrabold text-base sm:text-xl tracking-tight text-outdoor-teal-dark dark:text-white truncate">
                Tak Tudy!
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-outdoor-text-secondary dark:text-outdoor-dark-secondary truncate hidden sm:block font-medium">
              „Plánuji, abych měla svobodu.“
            </p>
          </div>
        </div>

        {/* Trip Selector Dropdown & "Správa" Menu */}
        <div className="flex-1 min-w-0 max-w-[170px] xs:max-w-[220px] sm:max-w-xs mx-1 sm:mx-2 flex items-center gap-1 sm:gap-1.5">
          {trips.length > 0 && (
            <select
              value={activeTrip?.id || ''}
              onChange={(e) => {
                const found = trips.find((t) => t.id === e.target.value);
                if (found) onSelectTrip(found);
              }}
              aria-label="Výběr aktivní cesty"
              className="w-full text-xs font-semibold bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 text-outdoor-text dark:text-outdoor-dark-text focus:outline-none focus:ring-2 focus:ring-outdoor-teal transition-colors truncate"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}

          {/* "Správa" Dropdown Menu (export, upravit, nastavit, smazat) */}
          {activeTrip && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsManageOpen(!isManageOpen)}
                className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 shrink-0 active:scale-95 ${
                  isManageOpen
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800'
                }`}
                aria-label="Správa cesty"
                title="Správa cesty (export, upravit, nastavit, smazat)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Správa</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isManageOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isManageOpen && (
                <>
                  {/* Backdrop for click outside */}
                  <div
                    className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
                    onClick={() => setIsManageOpen(false)}
                  />

                  <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 bg-white dark:bg-outdoor-dark-card rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 py-1.5 z-50 animate-fade-in text-xs">
                    <div className="px-3.5 py-1.5 border-b border-stone-100 dark:border-stone-800 text-[10px] font-bold uppercase tracking-wider text-stone-400 truncate">
                      Správa cesty: <span className="text-stone-700 dark:text-stone-200">{activeTrip.title}</span>
                    </div>

                    {/* 0. Synchronizovat s webem */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsManageOpen(false);
                        onTriggerSync();
                      }}
                      className="w-full px-3.5 py-2.5 text-left bg-teal-50/70 dark:bg-teal-950/50 hover:bg-teal-100/80 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold flex items-center gap-2.5 transition-colors border-b border-stone-100 dark:border-stone-800"
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
                        className="w-full px-3.5 py-2.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2.5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                        <div>
                          <div className="font-bold">Smazat tuto cestu</div>
                          <div className="text-[10px] text-rose-400 font-normal">Nevratně odstranit cestu a její data</div>
                        </div>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* New Trip Button */}
          <button
            onClick={onOpenNewTrip}
            title="Vytvořit novou cestu"
            className="p-1 sm:p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center gap-1 text-xs font-semibold transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Nová cesta</span>
          </button>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
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
            className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full border transition-all active:scale-95 ${
              isSyncing
                ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40'
                : pendingSyncCount > 0
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
            aria-label="Synchronizovat s webem"
          >
            <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
            <span>{isSyncing ? 'Sync...' : pendingSyncCount > 0 ? `${pendingSyncCount}` : 'Sync'}</span>
          </button>

          {/* Mobile QR Code button (hidden on mobile phones) */}
          {onOpenQrModal && (
            <button
              onClick={onOpenQrModal}
              title="Otevřít v mobilu (zobrazit QR kód)"
              className="hidden md:flex px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 items-center gap-1.5 text-xs font-bold transition-all"
              aria-label="QR kód pro mobil"
            >
              <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Do mobilu</span>
            </button>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Přepnout na denní režim' : 'Přepnout na noční režim'}
            className="p-1.5 rounded-lg text-outdoor-text-secondary hover:text-outdoor-teal dark:text-stone-300 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Přepnout motiv vzhledu"
          >
            {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Odhlásit se"
            className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Odhlásit se"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
