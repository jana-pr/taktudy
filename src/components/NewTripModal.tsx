import React, { useState } from 'react';
import { TripStatus } from '../types';
import { tripsApi } from '../api/client';
import {
  X,
  Map,
  Calendar,
  Sparkles,
  Compass,
  Bot,
  Loader2,
  FileText,
  CheckCircle2,
} from 'lucide-react';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip: (data: {
    title: string;
    motto?: string;
    country_region?: string;
    status?: TripStatus;
    startDate?: string;
    endDate?: string;
    routeUrl?: string;
  }) => Promise<void>;
  onOpenAiPropose?: () => void;
  onOpenImport?: () => void;
  onTripImported?: (newTripId: string) => Promise<void>;
}

export const NewTripModal: React.FC<NewTripModalProps> = ({
  isOpen,
  onClose,
  onCreateTrip,
  onOpenAiPropose,
  onOpenImport,
  onTripImported,
}) => {
  const [tab, setTab] = useState<'manual' | 'chatgpt'>('manual');

  // Manual Form State
  const [title, setTitle] = useState('');
  const [motto, setMotto] = useState('');
  const [countryRegion, setCountryRegion] = useState('');
  const [status, setStatus] = useState<TripStatus>('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [routeUrl, setRouteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ChatGPT State
  const [chatGptText, setChatGptText] = useState('');
  const [chatGptLoading, setChatGptLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onCreateTrip({
        title: title.trim(),
        motto: motto.trim() || undefined,
        country_region: countryRegion.trim() || undefined,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        routeUrl: routeUrl.trim() || undefined,
      });

      // Reset form
      setTitle('');
      setMotto('');
      setCountryRegion('');
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

  const handleCreateFromChatGpt = async () => {
    if (!chatGptText.trim()) return;

    setChatGptLoading(true);
    setError(null);

    try {
      const res = await tripsApi.importRoute(chatGptText.trim(), 'chatgpt-plan.json', true);
      if (onTripImported) {
        await onTripImported(res.id);
      }
      setChatGptText('');
      onClose();
    } catch (err: any) {
      setError(
        err.message ||
          'Chyba při čtení textu z ChatGPT. Ujistěte se, že text obsahuje platný kód nebo itinerář.'
      );
    } finally {
      setChatGptLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-outdoor-dark-card w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-outdoor-teal-dark to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Compass className="w-6 h-6 text-teal-200" />
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

        {/* Top Switcher: Ručně vs Vložit z ChatGPT */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'manual'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Zadat údaje ručně</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('chatgpt')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'chatgpt'
                ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-600" />
            <span>Vložit text / JSON z ChatGPT</span>
          </button>
        </div>

        {/* Quick Assistant Cards (when in manual mode) */}
        {tab === 'manual' && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2">
            {onOpenAiPropose && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAiPropose();
                }}
                className="p-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl text-left transition-all"
              >
                <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  Navrhni mi trasu
                </div>
                <div className="text-[10px] text-purple-600/80 dark:text-purple-400 mt-0.5">
                  AI průvodce na míru
                </div>
              </button>
            )}

            {onOpenImport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                className="p-2.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 rounded-xl text-left transition-all"
              >
                <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-bold text-xs">
                  <Map className="w-3.5 h-3.5" />
                  Importovat soubor
                </div>
                <div className="text-[10px] text-teal-600/80 dark:text-teal-400 mt-0.5">
                  GPX, KML nebo JSON soubor
                </div>
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 text-xs border-b border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <div className="p-5 flex-1 overflow-y-auto">
          {/* TAB 1: Manual Trip Creation */}
          {tab === 'manual' && (
            <form onSubmit={handleSubmitManual} className="space-y-4">
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
                  placeholder="Např. Srí Lanka 2026, Jižní Morava, Madeira..."
                  className="w-full px-3.5 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold dark:bg-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
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
                  placeholder="Např. Čajové plantáže, pláže a chrámy..."
                  className="w-full px-3.5 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
                />
              </div>

              {/* Destinace / Region */}
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  Destinace / Region trasy (pro počasí)
                </label>
                <input
                  type="text"
                  value={countryRegion}
                  onChange={(e) => setCountryRegion(e.target.value)}
                  placeholder="Např. Jižní Morava, Srí Lanka, Toskánsko, Madeira..."
                  className="w-full px-3.5 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
                />
              </div>

              {/* Stav cesty */}
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  Stav
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TripStatus)}
                  className="w-full px-3.5 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
                >
                  <option value="planning">Připravujeme (Plánování)</option>
                  <option value="active">Právě probíhá (Aktivní)</option>
                  <option value="completed">Dokončeno (Archiv)</option>
                </select>
              </div>

              {/* Termín cesty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Od
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Do
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-outdoor-teal hover:bg-outdoor-teal-dark active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4" />
                  <span>{loading ? 'Vytvářím...' : 'Vytvořit cestu'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Direct Paste from ChatGPT */}
          {tab === 'chatgpt' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-2xl text-xs text-purple-900 dark:text-purple-200">
                <strong>💡 Jak založit trasu:</strong> Vložte sem odpověď z ChatGPT (i včetně textu okolo nebo značek <code>```json</code>). Aplikace si data sama očistí a založí novou cestu se všemi dny a místy!
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 uppercase tracking-wider">
                  Vložte text nebo JSON kód z ChatGPT:
                </label>
                <textarea
                  rows={9}
                  value={chatGptText}
                  onChange={(e) => setChatGptText(e.target.value)}
                  placeholder="Vložte text nebo kód z ChatGPT..."
                  className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-stone-900 border border-gray-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="button"
                disabled={chatGptLoading || !chatGptText.trim()}
                onClick={handleCreateFromChatGpt}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {chatGptLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Založit novou trasu z ChatGPT</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
