import React, { useState } from 'react';
import { Category, POI } from '../types';
import { importApi } from '../api/client';
import { compressImageFile } from '../utils/imageCompressor';
import { X, Link2, Sparkles, MapPin, Loader2, Star, Check, Camera, Image as ImageIcon } from 'lucide-react';

interface QuickAddPoiModalProps {
  tripId: string;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onAddPoi: (poiData: Partial<POI>) => void;
  initialCoords?: { lat: number; lng: number } | null;
}

export const QuickAddPoiModal: React.FC<QuickAddPoiModalProps> = ({
  tripId,
  categories,
  isOpen,
  onClose,
  onAddPoi,
  initialCoords,
}) => {
  const [activeMode, setActiveMode] = useState<'quick' | 'url' | 'manual'>('quick');
  const [name, setName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [categoryId, setCategoryId] = useState('other');
  const [isTop, setIsTop] = useState(false);
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [lat, setLat] = useState<number>(7.2906);
  const [lng, setLng] = useState<number>(80.6337);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeSuccess, setScrapeSuccess] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialCoords && isOpen) {
      setLat(initialCoords.lat);
      setLng(initialCoords.lng);
    }
  }, [initialCoords, isOpen]);

  if (!isOpen) return null;

  // URL Import Handler
  const handleImportUrl = async () => {
    if (!urlInput.trim()) return;
    setIsScraping(true);
    setScrapeError(null);
    setScrapeSuccess(false);

    try {
      const meta = await importApi.fetchUrlMetadata(urlInput.trim());
      if (meta.title) setName(meta.title);
      if (meta.description) setDescription(meta.description);
      if (meta.imageUrl) setPhotoUrl(meta.imageUrl);
      if (meta.lat && meta.lng) {
        setLat(meta.lat);
        setLng(meta.lng);
      }
      setScrapeSuccess(true);
    } catch (err: any) {
      setScrapeError(err.message || 'Nepodařilo se vytěžit informace z odkazu.');
    } finally {
      setIsScraping(false);
    }
  };

  // Quick GPS capture
  const handleGetGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        () => {
          alert('GPS poloha není momentálně dostupná.');
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddPoi({
      trip_id: tripId,
      name: name.trim(),
      category_id: categoryId,
      is_top: isTop,
      lat,
      lng,
      description: description.trim() || undefined,
      private_notes: notes.trim() || undefined,
      source_url: urlInput.trim() || undefined,
      main_photo_url: photoUrl.trim() || undefined,
      time_mode: 'none',
      visit_status: 'unvisited',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-outdoor-dark-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <h2 className="font-heading font-extrabold text-lg text-outdoor-text dark:text-white">
              Přidat bod zájmu
            </h2>
            <p className="text-xs text-outdoor-text-secondary dark:text-stone-400">
              „Uložit teď, doplnit později.“
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveMode('quick')}
            className={`flex-1 py-2.5 text-center transition-colors ${
              activeMode === 'quick'
                ? 'border-b-2 border-outdoor-teal text-outdoor-teal font-bold bg-white dark:bg-outdoor-dark-card'
                : 'text-stone-500'
            }`}
          >
            Rychle názvem
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('url')}
            className={`flex-1 py-2.5 text-center transition-colors ${
              activeMode === 'url'
                ? 'border-b-2 border-outdoor-teal text-outdoor-teal font-bold bg-white dark:bg-outdoor-dark-card'
                : 'text-stone-500'
            }`}
          >
            Z odkazu / URL
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* URL Import field */}
          {activeMode === 'url' && (
            <div className="p-3 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
              <label className="block text-xs font-bold text-outdoor-text dark:text-stone-300">
                Vlož odkaz na místo / podnik / článek
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 text-xs border rounded-lg dark:bg-stone-800 dark:border-stone-700"
                />
                <button
                  type="button"
                  onClick={handleImportUrl}
                  disabled={isScraping || !urlInput}
                  className="px-3 py-2 bg-outdoor-teal text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  {isScraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Načíst</span>
                </button>
              </div>

              {scrapeSuccess && (
                <div className="text-[11px] text-outdoor-positive flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Informace načteny. Můžeš je níže zkontrolovat a upravit.</span>
                </div>
              )}

              {scrapeError && (
                <div className="text-[11px] text-red-500">{scrapeError}</div>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
              Název místa *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Např. Kavárna s výhledem, Most, Pláž..."
              className="w-full px-3.5 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
            />
          </div>

          {/* Category & TOP Flag */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                Kategorie
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label_cs.split('/')[0].trim()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                Priorita
              </label>
              <button
                type="button"
                onClick={() => setIsTop(!isTop)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                  isTop
                    ? 'bg-outdoor-top text-white border-outdoor-top shadow-sm'
                    : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isTop ? 'fill-white' : 'text-stone-400'}`} />
                <span>{isTop ? '★ TOP MÍSTO' : 'Běžné místo'}</span>
              </button>
            </div>
          </div>

          {/* Notes / Fast description */}
          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
              Rychlá poznámka / Proč sem chci
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Doporučení od známého, otevírací doba, co ochutnat..."
              className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
            />
          </div>

          {/* Photo upload / URL */}
          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
              Fotografie místa
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="URL odkazu na fotku..."
                className="flex-1 px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800"
              />
              <label
                className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl cursor-pointer shrink-0 transition-colors"
                title="Nahrát fotku z mobilu"
              >
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const compressed = await compressImageFile(file);
                        setPhotoUrl(compressed);
                      } catch {}
                    }
                  }}
                  className="hidden"
                />
              </label>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                  title="Odebrat fotku"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {photoUrl && (
              <div className="mt-2 h-24 w-full rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
                <img src={photoUrl} alt="Náhled" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* GPS Coordinate helper */}
          <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
            <span>Souřadnice: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
            <button
              type="button"
              onClick={handleGetGps}
              className="text-outdoor-teal font-semibold flex items-center gap-1 hover:underline"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Použít moji GPS</span>
            </button>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-outdoor-teal hover:bg-outdoor-teal-dark active:scale-95 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Uložit bod do cesty</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
