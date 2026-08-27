import React, { useState } from 'react';
import { FullTrip } from '../types';
import { tripsApi } from '../api/client';
import { X, Bot, Sparkles, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface EditRouteFromChatGptModalProps {
  trip: FullTrip | null;
  isOpen: boolean;
  onClose: () => void;
  onTripUpdated: () => Promise<void>;
}

export const EditRouteFromChatGptModal: React.FC<EditRouteFromChatGptModalProps> = ({
  trip,
  isOpen,
  onClose,
  onTripUpdated,
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !trip) return null;

  const handleApply = async () => {
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await tripsApi.replaceRoute(trip.id, content.trim(), 'chatgpt-plan.json');
      setSuccess(true);
      await onTripUpdated();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se aktualizovat trasu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Aktualizace trasy
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Upravit trasu z ChatGPT
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Upravujete cestu: <strong>{trip.title}</strong>. Vložte novou odpověď nebo kód z ChatGPT. Nové dny a místa nahradí stávající itinerář, zatímco cesta a její nastavení zůstanou zachovány.
          </p>

          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Trasa cesty byla úspěšně aktualizována!</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Vložte odpověď z ChatGPT:
            </label>
            <textarea
              rows={9}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Vložte text nebo JSON kód z ChatGPT (včetně ```json značek nebo úvodního textu)..."
              className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 rounded-2xl text-[11px] text-purple-950 dark:text-purple-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Aplikace si z textu automaticky sama najde a očistí formát JSON, přepočítá dny a aktualizuje místa na mapě.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Zrušit
          </button>

          <button
            type="button"
            disabled={loading || !content.trim()}
            onClick={handleApply}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Aktualizovat trasu cesty
          </button>
        </div>
      </div>
    </div>
  );
};
