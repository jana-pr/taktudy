import React from 'react';
import { Map, Calendar, MapPin, Sparkles, Plus, Navigation } from 'lucide-react';

export type TabType = 'map' | 'plan' | 'pois' | 'today';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onQuickAdd: () => void;
  onOpenNearMe: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onQuickAdd,
  onOpenNearMe,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-outdoor-dark-card/95 backdrop-blur border-t border-stone-200 dark:border-stone-800 safe-area-pb transition-colors shadow-lg">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around relative">
        {/* Mapa */}
        <button
          onClick={() => onSelectTab('map')}
          className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
            activeTab === 'map'
              ? 'text-outdoor-teal dark:text-outdoor-dark-route font-bold'
              : 'text-outdoor-text-secondary dark:text-stone-400 hover:text-outdoor-teal'
          }`}
          aria-label="Mapa s trasou a body"
        >
          <Map className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] tracking-tight">Mapa</span>
        </button>

        {/* Plán */}
        <button
          onClick={() => onSelectTab('plan')}
          className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
            activeTab === 'plan'
              ? 'text-outdoor-teal dark:text-outdoor-dark-route font-bold'
              : 'text-outdoor-text-secondary dark:text-stone-400 hover:text-outdoor-teal'
          }`}
          aria-label="Itinerář cesty"
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] tracking-tight">Plán</span>
        </button>

        {/* Floating Quick Add Button (Thumb Zone) */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            onClick={onQuickAdd}
            className="w-13 h-13 w-12 h-12 rounded-full bg-outdoor-teal text-white flex items-center justify-center shadow-lg hover:bg-outdoor-teal-dark active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-outdoor-teal/30"
            aria-label="Rychle přidat bod zájmu"
            title="Přidat bod (Uložit teď, doplnit později)"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Body */}
        <button
          onClick={() => onSelectTab('pois')}
          className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
            activeTab === 'pois'
              ? 'text-outdoor-teal dark:text-outdoor-dark-route font-bold'
              : 'text-outdoor-text-secondary dark:text-stone-400 hover:text-outdoor-teal'
          }`}
          aria-label="Seznam všech bodů"
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] tracking-tight">Body</span>
        </button>

        {/* Dnes */}
        <button
          onClick={() => onSelectTab('today')}
          className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
            activeTab === 'today'
              ? 'text-outdoor-coral dark:text-outdoor-coral font-bold'
              : 'text-outdoor-text-secondary dark:text-stone-400 hover:text-outdoor-coral'
          }`}
          aria-label="Režim Dnes v terénu"
        >
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] tracking-tight">Dnes</span>
        </button>

        {/* Near me floating quick chip */}
        <button
          onClick={onOpenNearMe}
          title="Co mám poblíž?"
          className="absolute -top-12 right-4 px-3 py-1.5 rounded-full bg-white dark:bg-outdoor-dark-card border border-stone-200 dark:border-stone-700 shadow-md text-xs font-semibold text-outdoor-text dark:text-stone-200 flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 active:scale-95 transition-all"
        >
          <Navigation className="w-3.5 h-3.5 text-outdoor-teal dark:text-outdoor-dark-route" />
          <span>Co mám poblíž?</span>
        </button>
      </div>
    </nav>
  );
};
