import React, { useState, useEffect } from 'react';
import { Tip, FullTrip } from '../types';
import { tipsApi } from '../api/client';
import {
  Lightbulb,
  Plus,
  MapPin,
  Calendar,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Search,
  Filter,
  Loader2,
  Sparkles,
  Navigation,
  Bookmark,
} from 'lucide-react';

interface TipsViewProps {
  activeTrip: FullTrip | null;
  onNavigateToMap?: (lat: number, lng: number) => void;
  onTripUpdated?: () => Promise<void>;
}

export const TipsView: React.FC<TipsViewProps> = ({
  activeTrip,
  onNavigateToMap,
  onTripUpdated,
}) => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [categoryId, setCategoryId] = useState('other');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Promote state (which tip is currently opening day selection)
  const [promotingTipId, setPromotingTipId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string>('');
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadTips = async () => {
    try {
      setLoading(true);
      const data = await tipsApi.getAll();
      setTips(data);
    } catch (err) {
      console.error('Chyba při načítání tipů:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTips();
  }, []);

  const handleCreateTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await tipsApi.create({
        title: title.trim(),
        location_name: locationName.trim() || undefined,
        category_id: categoryId,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        notes: notes.trim() || undefined,
        source_url: sourceUrl.trim() || undefined,
        trip_id: activeTrip ? activeTrip.id : undefined,
      });

      setTitle('');
      setLocationName('');
      setNotes('');
      setSourceUrl('');
      setLat('');
      setLng('');
      setIsAddOpen(false);
      await loadTips();
      showToast('Tip byl úspěšně uložen do zásobárny!');
    } catch (err: any) {
      alert(err.message || 'Chyba při ukládání tipu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTip = async (id: string, tipTitle: string) => {
    if (!confirm(`Opravdu chcete smazat tip „${tipTitle}“?`)) return;
    try {
      await tipsApi.delete(id);
      setTips((prev) => prev.filter((t) => t.id !== id));
      showToast('Tip byl smazán.');
    } catch (err: any) {
      alert(err.message || 'Nepodařilo se smazat tip.');
    }
  };

  const handlePromoteToPoi = async (tipId: string) => {
    if (!activeTrip || !selectedDayId) return;

    setPromoteLoading(true);
    try {
      const res = await tipsApi.promoteToPoi(tipId, {
        tripId: activeTrip.id,
        dayId: selectedDayId,
      });
      setPromotingTipId(null);
      setSelectedDayId('');
      await loadTips();
      if (onTripUpdated) await onTripUpdated();
      showToast(res.message || 'Místo bylo přidáno do itineráře!');
    } catch (err: any) {
      alert(err.message || 'Nepodařilo se přidat tip do itineráře.');
    } finally {
      setPromoteLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered Tips
  const filteredTips = tips.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.location_name && t.location_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === 'all' || t.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 pb-24 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 z-50 p-3.5 bg-gray-900 text-white rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-amber-500/5 p-6 rounded-3xl border border-amber-200/50 dark:border-amber-900/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Lightbulb className="w-4 h-4" />
            <span>Inspirace & Wishlist</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
            Zásobárna tipů
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-xl">
            Místa, kavárny, vyhlídky a zážitky, které vás zaujaly. Uložte si je sem s přibližnou lokací a kdykoliv je jedním kliknutím zařaďte do itineráře cesty.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(!isAddOpen)}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isAddOpen ? 'Zavřít formulář' : 'Přidat nový tip'}</span>
        </button>
      </div>

      {/* Add Tip Form (Expandable) */}
      {isAddOpen && (
        <form
          onSubmit={handleCreateTip}
          className="p-5 sm:p-6 bg-white dark:bg-gray-800 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-lg space-y-4 animate-scale-up"
        >
          <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>Nový tip do zásobárny</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Název místa / tipu *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Např. Cafe Chill, Coconut Tree Hill, pláž Goyambokka..."
                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Lokalita / Město
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Např. Ella, Mirissa, Kandy, Tangalle..."
                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Kategorie
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="food">🍽️ Jídlo / Restaurace</option>
                <option value="bar">🍸 Bar / Kavárna</option>
                <option value="view">👁️ Vyhlídka / Panorama</option>
                <option value="nature">🌴 Příroda / Pláž / Park</option>
                <option value="monument">🏛️ Památka / Chrám</option>
                <option value="accommodation">🏨 Ubytování / Hotel</option>
                <option value="transport">🚂 Doprava / Zážitek</option>
                <option value="other">📍 Ostatní místa</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Zeměp. šířka (lat)
                </label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="např. 6.8745"
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Zeměp. délka (lng)
                </label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="např. 81.0460"
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Poznámka / Proč mě zaujalo
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Doporučení od známých, skvělé jídlo, fotogenické místo při západu slunce..."
              className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Uložit tip</span>
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat v tipech (název, lokalita, poznámka)..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'Všechny' },
            { id: 'food', label: 'Jídlo' },
            { id: 'view', label: 'Vyhlídky' },
            { id: 'nature', label: 'Příroda' },
            { id: 'monument', label: 'Památky' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                filterCategory === cat.id
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tips Cards List */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Načítám zásobárnu tipů...</p>
        </div>
      ) : filteredTips.length === 0 ? (
        <div className="text-center py-16 p-8 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Žádné tipy v této kategorii
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Přidejte si místa, která chcete na cestě prozkoumat, a mějte je po ruce!
          </p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat první tip</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTips.map((tip) => (
            <div
              key={tip.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                tip.is_used
                  ? 'bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/60 opacity-80'
                  : 'bg-white dark:bg-gray-800 border-gray-200/80 dark:border-gray-700 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="space-y-2.5">
                {/* Top badges */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider"
                    style={{ backgroundColor: tip.category_color || '#546E7A' }}
                  >
                    {tip.category_label || tip.category_id}
                  </span>

                  {tip.is_used ? (
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> V itineráři
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-md text-[10px] font-bold">
                      💡 Tip
                    </span>
                  )}
                </div>

                {/* Title & Location */}
                <div>
                  <h3 className="font-heading font-bold text-base text-gray-900 dark:text-white">
                    {tip.title}
                  </h3>
                  {tip.location_name && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{tip.location_name}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {tip.notes && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 bg-gray-50 dark:bg-gray-750 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                    {tip.notes}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 mt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                {/* Promote to itinerary picker */}
                {promotingTipId === tip.id ? (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-2">
                    <div className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                      Vyberte den cesty pro zařazení:
                    </div>
                    <select
                      value={selectedDayId}
                      onChange={(e) => setSelectedDayId(e.target.value)}
                      className="w-full p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs"
                    >
                      <option value="">-- Zvolte den --</option>
                      {activeTrip?.days?.map((d) => (
                        <option key={d.id} value={d.id}>
                          Den {d.day_number}: {d.title}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setPromotingTipId(null)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-gray-500"
                      >
                        Zrušit
                      </button>
                      <button
                        type="button"
                        disabled={!selectedDayId || promoteLoading}
                        onClick={() => handlePromoteToPoi(tip.id)}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold shadow-xs flex items-center gap-1"
                      >
                        {promoteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        <span>Zařadit</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      {tip.lat && tip.lng && onNavigateToMap && (
                        <button
                          type="button"
                          onClick={() => onNavigateToMap(tip.lat!, tip.lng!)}
                          title="Zobrazit polohu na mapě"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-teal-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Navigation className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteTip(tip.id, tip.title)}
                        title="Smazat tip"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {activeTrip && (
                      <button
                        type="button"
                        onClick={() => {
                          setPromotingTipId(tip.id);
                          if (activeTrip.days && activeTrip.days.length > 0) {
                            setSelectedDayId(activeTrip.days[0].id);
                          }
                        }}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold border border-teal-200 dark:border-teal-800 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Přidat do itineráře</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
