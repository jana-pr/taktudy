import React, { useState } from 'react';
import { TripStatus } from '../types';
import { X, Map, Calendar, Sparkles, Compass } from 'lucide-react';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip: (data: {
    title: string;
    motto?: string;
    status?: TripStatus;
    startDate?: string;
    endDate?: string;
    routeUrl?: string;
  }) => Promise<void>;
}

export const NewTripModal: React.FC<NewTripModalProps> = ({
  isOpen,
  onClose,
  onCreateTrip,
}) => {
  const [title, setTitle] = useState('');
  const [motto, setMotto] = useState('');
  const [status, setStatus] = useState<TripStatus>('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [routeUrl, setRouteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onCreateTrip({
        title: title.trim(),
        motto: motto.trim() || undefined,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        routeUrl: routeUrl.trim() || undefined,
      });

      // Reset form
      setTitle('');
      setMotto('');
      setStatus('planning');
      setStartDate('');
      setEndDate('');
      setRouteUrl('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se vytvořit cestu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-outdoor-dark-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-outdoor-teal-dark to-outdoor-teal text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur">
              <Compass className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg">
                Vytvořit novou cestu
              </h2>
              <p className="text-xs text-teal-100">Začni plánovat další dobrodružství</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Zavřít"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs border-b border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Název cesty */}
          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
              Název cesty *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Např. Jižní Morava — vinice, Madeira — levády..."
              className="w-full px-3.5 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
            />
          </div>

          {/* Motto / Poznámka */}
          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
              Motto nebo myšlenka cesty
            </label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              placeholder="Např. Plánuji, abych měla svobodu."
              className="w-full px-3.5 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
            />
          </div>

          {/* Stav cesty */}
          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
              Stav životního cyklu
            </label>
            <select
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium dark:bg-stone-800"
            >
              <option value="idea">💡 Nápad (pouze sbírám tipy)</option>
              <option value="planning">📝 Plánuji (skládám dny a trasy)</option>
              <option value="ready">🎒 Připravená (čekám na odjezd)</option>
              <option value="traveling">🚀 Právě cestuji (jsem v terénu)</option>
            </select>
          </div>

          {/* Odkaz na trasu (Mapy.cz / Google Maps) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                Odkaz na celou trasu (Mapy.cz / Google Maps)
              </label>
              <span className="text-[10px] text-stone-400 font-medium">volitelné</span>
            </div>
            <input
              type="url"
              value={routeUrl}
              onChange={(e) => setRouteUrl(e.target.value)}
              placeholder="https://mapy.cz/s/... nebo https://maps.app.goo.gl/..."
              className="w-full px-3.5 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
            />
            <p className="text-[11px] text-outdoor-text-secondary dark:text-stone-400 mt-1">
              💡 V aplikaci se trasa na mapě automaticky tvoří z vašich přidaných bodů. Tento odkaz slouží pro rychlý proklik na váš externí mapový plán.
            </p>
          </div>

          {/* Termín cesty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                Datum od (volitelné)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                Datum do (volitelné)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="w-full py-3 bg-outdoor-teal hover:bg-outdoor-teal-dark active:scale-95 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Vytvářím cestu...' : 'Vytvořit a začít plánovat'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
