import React, { useState } from 'react';
import { POI, Category } from '../types';
import { Search, Star, MapPin, ChevronRight, CheckCircle2, Circle, Clock, Plus } from 'lucide-react';

interface PoiListViewProps {
  pois: POI[];
  categories: Category[];
  onSelectPoi: (poi: POI) => void;
  onToggleTop: (poiId: string) => void;
  onToggleVisit: (poiId: string, currentStatus: string) => void;
  onOpenQuickAdd?: () => void;
}

export const PoiListView: React.FC<PoiListViewProps> = ({
  pois,
  categories,
  onSelectPoi,
  onToggleTop,
  onToggleVisit,
  onOpenQuickAdd,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [onlyTop, setOnlyTop] = useState(false);

  const safePois = pois || [];
  const filteredPois = safePois.filter((poi) => {
    if (onlyTop && !poi.is_top) return false;
    if (selectedCategory && poi.category_id !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = poi.name.toLowerCase().includes(q);
      const matchDesc = poi.description?.toLowerCase().includes(q);
      const matchAddress = poi.address?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchAddress) return false;
    }
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Search & Add Row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat v místech, popisech nebo adresách..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-outdoor-dark-card border border-stone-200 dark:border-stone-800 rounded-xl text-sm text-outdoor-text dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-outdoor-teal transition-all shadow-sm"
          />
        </div>

        {onOpenQuickAdd && (
          <button
            onClick={onOpenQuickAdd}
            className="px-3.5 py-2.5 bg-outdoor-coral hover:bg-outdoor-coral/90 text-white rounded-xl text-xs font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1.5 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Přidat bod</span>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {/* TOP Filter button (AC-03, AC-04) */}
        <button
          onClick={() => setOnlyTop(!onlyTop)}
          className={`flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all flex-shrink-0 active:scale-95 ${
            onlyTop
              ? 'bg-outdoor-top text-white shadow'
              : 'bg-white dark:bg-outdoor-dark-card border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300'
          }`}
          aria-label="Filtr pouze TOP místa"
        >
          <Star className={`w-3.5 h-3.5 ${onlyTop ? 'fill-white' : 'fill-outdoor-top text-outdoor-top'}`} />
          <span>Pouze TOP</span>
        </button>

        {/* All categories */}
        <button
          onClick={() => setSelectedCategory(null)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex-shrink-0 ${
            selectedCategory === null
              ? 'bg-outdoor-teal-dark text-white shadow'
              : 'bg-white dark:bg-outdoor-dark-card border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300'
          }`}
        >
          Vše ({pois.length})
        </button>

        {/* Category Pills */}
        {categories.map((cat) => {
          const count = pois.filter((p) => p.category_id === cat.id).length;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex-shrink-0 ${
                isSelected
                  ? 'bg-outdoor-teal-dark text-white shadow'
                  : 'bg-white dark:bg-outdoor-dark-card border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              {cat.label_cs.split('/')[0].trim()} ({count})
            </button>
          );
        })}
      </div>

      {/* POI Cards */}
      {filteredPois.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-outdoor-dark-card rounded-2xl border border-stone-200 dark:border-stone-800 p-8 shadow-sm">
          <p className="text-stone-500 dark:text-stone-400 font-medium text-sm">
            Tady zatím žádná místa neodpovídají filtru.
          </p>
          <p className="text-stone-400 text-xs mt-1">Zkus upravit hledání nebo filtry.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPois.map((poi) => {
            const isVisited = poi.visit_status === 'visited';

            return (
              <div
                key={poi.id}
                onClick={() => onSelectPoi(poi)}
                className={`group flex items-center gap-3.5 p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                  isVisited
                    ? 'bg-stone-50 dark:bg-stone-900/30 border-stone-200 dark:border-stone-800 opacity-60'
                    : 'bg-white dark:bg-outdoor-dark-card border-stone-200 dark:border-stone-800 shadow-sm hover:border-outdoor-teal/40 hover:shadow-md'
                }`}
              >
                {/* Photo Thumbnail */}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 flex-shrink-0">
                  <img
                    src={
                      poi.main_photo_url ||
                      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=200&q=80'
                    }
                    alt={poi.name}
                    className="w-full h-full object-cover"
                  />
                  {poi.is_top && (
                    <div className="absolute top-1 right-1 bg-outdoor-top text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow border border-white">
                      ★
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3
                      className={`font-semibold text-sm sm:text-base ${
                        isVisited
                          ? 'line-through text-stone-400 dark:text-stone-500'
                          : 'text-outdoor-text dark:text-white'
                      }`}
                    >
                      {poi.name}
                    </h3>
                  </div>

                  {poi.time_mode !== 'none' && poi.target_time && (
                    <div className="flex items-center gap-1 text-xs text-outdoor-coral font-bold mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        {poi.target_time} {poi.time_mode === 'fixed' ? '(pevný čas)' : ''}
                      </span>
                    </div>
                  )}

                  {poi.address && (
                    <p className="text-xs text-stone-400 truncate mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span>{poi.address}</span>
                    </p>
                  )}
                </div>

                {/* Quick Actions (TOP toggle & Visit toggle) */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Star Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTop(poi.id);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      poi.is_top
                        ? 'text-outdoor-top bg-red-50 dark:bg-red-950/40'
                        : 'text-stone-300 hover:text-outdoor-top'
                    }`}
                    title={poi.is_top ? 'Odebrat z TOP' : 'Přidat do TOP'}
                    aria-label={`Přepnout TOP pro ${poi.name}`}
                  >
                    <Star className={`w-4 h-4 ${poi.is_top ? 'fill-outdoor-top' : ''}`} />
                  </button>

                  {/* Visit Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisit(poi.id, poi.visit_status);
                    }}
                    className="p-2 rounded-lg text-stone-300 hover:text-outdoor-positive transition-colors"
                    title={isVisited ? 'Označit jako nenavštíveno' : 'Označit jako navštíveno'}
                    aria-label={`Přepnout stav návštěvy pro ${poi.name}`}
                  >
                    {isVisited ? (
                      <CheckCircle2 className="w-4 h-4 text-outdoor-positive" />
                    ) : (
                      <Circle className="w-4 h-4 stroke-stone-300" />
                    )}
                  </button>

                  {/* Open Detail Affordance */}
                  <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-outdoor-teal ml-1 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
