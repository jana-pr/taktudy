import React from 'react';
import { Trip } from '../types';
import { Compass, Moon, Sun, Share2, CheckCircle2, CloudUpload, HardDrive, LogOut, Plus, MapPin } from 'lucide-react';

interface NavbarProps {
  trips: Trip[];
  activeTrip: Trip | null;
  onSelectTrip: (trip: Trip) => void;
  onOpenNewTrip: () => void;
  onOpenQuickAdd?: () => void;
  onOpenShare: () => void;
  onOpenOfflineChecklist: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  trips,
  activeTrip,
  onSelectTrip,
  onOpenNewTrip,
  onOpenQuickAdd,
  onOpenShare,
  onOpenOfflineChecklist,
  isDarkMode,
  onToggleDarkMode,
  isOnline,
  pendingSyncCount,
  onTriggerSync,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-outdoor-dark-card/95 backdrop-blur border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo & Motto */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-outdoor-teal-dark flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Compass className="w-6 h-6 text-outdoor-coral" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-xl tracking-tight text-outdoor-teal-dark dark:text-white">
                Tak tudy!
              </span>
            </div>
            <p className="text-xs text-outdoor-text-secondary dark:text-outdoor-dark-secondary truncate hidden sm:block font-medium">
              „Plánuji, abych měla svobodu.“
            </p>
          </div>
        </div>

        {/* Trip Selector Dropdown & New Trip Button */}
        <div className="flex-1 max-w-xs mx-2 flex items-center gap-1.5">
          {trips.length > 0 && (
            <select
              value={activeTrip?.id || ''}
              onChange={(e) => {
                const found = trips.find((t) => t.id === e.target.value);
                if (found) onSelectTrip(found);
              }}
              aria-label="Výběr aktivní cesty"
              className="w-full text-xs sm:text-sm font-semibold bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-outdoor-text dark:text-outdoor-dark-text focus:outline-none focus:ring-2 focus:ring-outdoor-teal transition-colors truncate"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}

          {/* New Trip Button */}
          <button
            onClick={onOpenNewTrip}
            title="Vytvořit novou cestu"
            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center gap-1 text-xs font-semibold transition-all flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Nová cesta</span>
          </button>

          {/* Primary Action: Add POI to active trip */}
          {activeTrip && onOpenQuickAdd && (
            <button
              onClick={onOpenQuickAdd}
              title="Přidat nový bod zájmu do této cesty"
              className="px-2.5 py-1.5 rounded-lg bg-outdoor-coral hover:bg-outdoor-coral/90 text-white flex items-center gap-1 text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>+ Přidat bod</span>
            </button>
          )}
        </div>


        {/* Actions & Status */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sync / Offline badge */}
          {pendingSyncCount > 0 ? (
            <button
              onClick={onTriggerSync}
              title={`${pendingSyncCount} neodeslaných změn. Kliknutím synchronizovat.`}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse hover:bg-amber-500/20"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{pendingSyncCount}</span>
            </button>
          ) : (
            <button
              onClick={onOpenOfflineChecklist}
              title="Cesta je připravena offline"
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-outdoor-positive/10 text-outdoor-positive dark:text-emerald-400 border border-outdoor-positive/20 hover:bg-outdoor-positive/20 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Offline</span>
            </button>
          )}

          {/* Offline Checklist button */}
          <button
            onClick={onOpenOfflineChecklist}
            title="Ověřit offline připravenost"
            className="p-2 rounded-lg text-outdoor-text-secondary hover:text-outdoor-teal dark:text-stone-300 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Offline checklist"
          >
            <HardDrive className="w-5 h-5" />
          </button>

          {/* Share button */}
          <button
            onClick={onOpenShare}
            title="Sdílet tuto cestu"
            className="p-2 rounded-lg text-outdoor-text-secondary hover:text-outdoor-teal dark:text-stone-300 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Sdílet cestu"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Přepnout na denní režim' : 'Přepnout na noční režim'}
            className="p-2 rounded-lg text-outdoor-text-secondary hover:text-outdoor-teal dark:text-stone-300 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Přepnout motiv vzhledu"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-stone-600" />}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Odhlásit se"
            className="p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ml-1"
            aria-label="Odhlásit se"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
