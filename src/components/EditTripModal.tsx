import React, { useState, useEffect } from 'react';
import { FullTrip, TripStatus } from '../types';
import { X, Settings, Trash2, Copy, Sparkles, ExternalLink } from 'lucide-react';

interface EditTripModalProps {
  trip: FullTrip | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrip: (tripId: string, data: Partial<FullTrip>) => Promise<void>;
  onDuplicateTrip: (tripId: string) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({
  trip,
  isOpen,
  onClose,
  onUpdateTrip,
  onDuplicateTrip,
  onDeleteTrip,
}) => {
  const [title, setTitle] = useState('');
  const [motto, setMotto] = useState('');
  const [status, setStatus] = useState<TripStatus>('planning');
  const [routeUrl, setRouteUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trip) return;
    setTitle(trip.title);
    setMotto(trip.motto || '');
    setStatus(trip.status);
    setRouteUrl(trip.route_url || '');
    setStartDate(trip.start_date || '');
    setEndDate(trip.end_date || '');
  }, [trip, isOpen]);

  if (!isOpen || !trip) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onUpdateTrip(trip.id, {
        title: title.trim(),
        motto: motto.trim() || undefined,
        status,
        route_url: routeUrl.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se uložit změny cesty.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-outdoor-dark-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-outdoor-teal/10 text-outdoor-teal">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg text-outdoor-text dark:text-white">
                Nastavení a úprava cesty
              </h2>
              <p className="text-xs text-outdoor-text-secondary dark:text-stone-400">
                Kdykoliv můžete změnit trasu, název i stav
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 text-xs border-b">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
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
              className="w-full px-3.5 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold dark:bg-stone-800"
            />
          </div>

          {/* Odkaz na trasu (Mapy.cz / Google Maps) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                Odkaz na trasu (Mapy.cz / Google Maps)
              </label>
              {routeUrl && (
                <a
                  href={routeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-outdoor-teal font-semibold flex items-center gap-0.5 hover:underline"
                >
                  <span>Otestovat odkaz</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <input
              type="url"
              value={routeUrl}
              onChange={(e) => setRouteUrl(e.target.value)}
              placeholder="https://mapy.cz/s/... nebo https://maps.app.goo.gl/..."
              className="w-full px-3.5 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 focus:ring-2 focus:ring-outdoor-teal"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Zde můžete kdykoliv změnit odkaz na trasu vložením nového odkazu.
            </p>
          </div>

          {/* Motto */}
          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
              Motto cesty
            </label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              className="w-full px-3.5 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800"
            />
          </div>

          {/* Stav cesty */}
          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
              Stav cesty (cesta zůstává vždy editovatelná)
            </label>
            <select
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800"
            >
              <option value="idea">💡 Nápad</option>
              <option value="planning">📝 Plánuji</option>
              <option value="ready">🎒 Připravená</option>
              <option value="traveling">🚀 Právě cestuji</option>
              <option value="completed">🏁 Dokončená</option>
              <option value="archived">📦 Archiv</option>
            </select>
          </div>

          {/* Termín */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                Datum od
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
                Datum do
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-outdoor-teal hover:bg-outdoor-teal-dark active:scale-95 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Ukládám...' : 'Uložit změny cesty'}</span>
            </button>
          </div>

          {/* Secondary actions (Duplicate, Delete) */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={async () => {
                await onDuplicateTrip(trip.id);
                onClose();
              }}
              className="text-stone-600 dark:text-stone-300 hover:text-outdoor-teal flex items-center gap-1 font-semibold"
            >
              <Copy className="w-4 h-4" />
              <span>Duplikovat cestu</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (confirm(`Opravdu chcete smazat cestu "${trip.title}"?`)) {
                  await onDeleteTrip(trip.id);
                  onClose();
                }
              }}
              className="text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              <span>Smazat cestu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
