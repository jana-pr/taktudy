import React, { useState, useEffect } from 'react';
import { FullTrip, TripStatus } from '../types';
import { tripsApi } from '../api/client';
import {
  X,
  Settings,
  Trash2,
  Copy,
  Sparkles,
  Download,
  Bot,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
} from 'lucide-react';

interface EditTripModalProps {
  trip: FullTrip | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrip: (tripId: string, data: Partial<FullTrip>) => Promise<void>;
  onDuplicateTrip: (tripId: string) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
  onTripUpdated?: () => Promise<void>;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({
  trip,
  isOpen,
  onClose,
  onUpdateTrip,
  onDuplicateTrip,
  onDeleteTrip,
  onTripUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'chatgpt'>('basic');

  // Form State for Basic Info
  const [title, setTitle] = useState('');
  const [motto, setMotto] = useState('');
  const [countryRegion, setCountryRegion] = useState('');
  const [status, setStatus] = useState<TripStatus>('planning');
  const [routeUrl, setRouteUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ChatGPT State
  const [chatGptContent, setChatGptContent] = useState('');
  const [chatGptLoading, setChatGptLoading] = useState(false);
  const [chatGptError, setChatGptError] = useState<string | null>(null);
  const [chatGptSuccess, setChatGptSuccess] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    if (!trip) return;
    setTitle(trip.title);
    setMotto(trip.motto || '');
    setCountryRegion(trip.country_region || '');
    setStatus(trip.status);
    setRouteUrl(trip.route_url || '');
    setStartDate(trip.start_date || '');
    setEndDate(trip.end_date || '');
    setChatGptContent('');
    setChatGptError(null);
    setChatGptSuccess(false);
    setActiveTab('basic');
  }, [trip, isOpen]);

  if (!isOpen || !trip) return null;

  // Build clean JSON representation for ChatGPT
  const exportData = {
    title: trip.title,
    motto: trip.motto || undefined,
    country_region: trip.country_region || 'Srí Lanka',
    travelers_count: trip.travelers_count || 3,
    primary_transport: trip.primary_transport || 'Soukromé auto s řidičem',
    start_date: trip.start_date || undefined,
    end_date: trip.end_date || undefined,
    days: (trip.days || []).map((d) => ({
      day_number: d.day_number,
      title: d.title,
      date: d.specific_date || undefined,
      start_location: d.start_location || undefined,
      overnight_location: d.overnight_location || undefined,
      transit_time_est: d.transit_time_est || undefined,
      distance_km: d.distance_km || 0,
      transport_mode: d.transport_mode || 'Auto',
      activities: d.activities || undefined,
    })),
    pois: (trip.pois || []).map((p) => {
      const dayObj = trip.days?.find((d) => d.id === p.day_id);
      return {
        name: p.name,
        category_id: p.category_id,
        lat: p.lat,
        lng: p.lng,
        day_number: dayObj ? dayObj.day_number : 1,
        description: p.description || undefined,
        why_visit: p.why_visit || undefined,
        recommended_duration: p.recommended_duration || undefined,
        cost_est: p.cost_est || 0,
        cost_category: p.cost_category || 'activities',
        is_mandatory: p.is_mandatory !== false,
      };
    }),
  };

  const jsonString = JSON.stringify(exportData, null, 2);

  const chatGptPrompt = `Ahoj ChatGPT, zde je aktuální itinerář mé cesty v aplikaci Tak tudy!:

\`\`\`json
${jsonString}
\`\`\`

Uprav prosím tento itinerář podle mých následujících pokynů:
[ZDE NAPIŠ SVÉ POŽADAVKY NA ÚPRAVU - NAPŘ. PŘIDEJ MÍSTA, ZMĚŇ HARMONOGRAM NEBO VYBER JINÉ RESTAURACE...]

DŮLEŽITÉ PRAVIDLO PRO ODPOVĚĎ:
Vrať mi POUZE kompletní upravený JSON ve stejné struktuře (včetně všech dní a míst), abych ho mohl/a přímo vložit zpět do aplikace Tak tudy!`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(chatGptPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-definice.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApplyChatGpt = async () => {
    if (!chatGptContent.trim()) return;

    setChatGptLoading(true);
    setChatGptError(null);

    try {
      await tripsApi.replaceRoute(trip.id, chatGptContent.trim(), 'chatgpt-plan.json');
      setChatGptSuccess(true);
      if (onTripUpdated) await onTripUpdated();
      setTimeout(() => {
        setChatGptSuccess(false);
        onClose();
      }, 1400);
    } catch (err: any) {
      setChatGptError(err.message || 'Nepodařilo se aktualizovat trasu z ChatGPT.');
    } finally {
      setChatGptLoading(false);
    }
  };

  const handleBasicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onUpdateTrip(trip.id, {
        title: title.trim(),
        motto: motto.trim() || undefined,
        country_region: countryRegion.trim() || undefined,
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
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-outdoor-dark-card w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg text-outdoor-text dark:text-white">
                Nastavení a úprava cesty
              </h2>
              <p className="text-xs text-outdoor-text-secondary dark:text-stone-400">
                {trip.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'basic'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Základní údaje cesty</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chatgpt')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'chatgpt'
                ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-600" />
            <span>ChatGPT (Export & Úprava)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: Basic Info */}
          {activeTab === 'basic' && (
            <form onSubmit={handleBasicSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 text-xs rounded-xl border border-red-200 dark:border-red-900">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  Název cesty *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  Motto cesty
                </label>
                <input
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  placeholder="Např. Dobrodružství po Srí Lance 2026..."
                  className="w-full px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  Destinace / Region trasy (pro počasí a mapy)
                </label>
                <input
                  type="text"
                  value={countryRegion}
                  onChange={(e) => setCountryRegion(e.target.value)}
                  placeholder="Např. Jižní Čechy, Srí Lanka, Toskánsko, Krkonoše..."
                  className="w-full px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    Stav cesty
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TripStatus)}
                    className="w-full px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="planning">Připravujeme</option>
                    <option value="active">Právě probíhá</option>
                    <option value="completed">Dokončeno</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    Odkaz na mapu
                  </label>
                  <input
                    type="url"
                    value={routeUrl}
                    onChange={(e) => setRouteUrl(e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    Datum od
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
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
                    className="w-full px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'Ukládám...' : 'Uložit základní údaje'}</span>
                </button>
              </div>

              {/* Safe Secondary actions */}
              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    await onDuplicateTrip(trip.id);
                    onClose();
                  }}
                  className="text-stone-600 dark:text-stone-300 hover:text-teal-600 flex items-center gap-1.5 font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplikovat cestu</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (
                      confirm(
                        `Opravdu chcete smazat celou cestu „${trip.title}“? Tato akce odstraní všech ${trip.days?.length || 0} dní a ${trip.pois?.length || 0} bodů zájmu.`
                      )
                    ) {
                      await onDeleteTrip(trip.id);
                      onClose();
                    }
                  }}
                  className="text-rose-500 hover:text-rose-700 flex items-center gap-1.5 font-semibold hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Smazat tuto cestu</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ChatGPT Export & Import */}
          {activeTab === 'chatgpt' && (
            <div className="space-y-6">
              {chatGptError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{chatGptError}</span>
                </div>
              )}

              {chatGptSuccess && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Trasa cesty byla úspěšně aktualizována z ChatGPT!</span>
                </div>
              )}

              {/* Section 1: Export Definition */}
              <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                  <Download className="w-4 h-4" />
                  <span>1. Stažení / Kopírování definice cesty pro ChatGPT</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Stáhněte si aktuální data cesty ({trip.days?.length || 0} dní, {trip.pois?.length || 0} míst) jako soubor <code>.json</code> nebo je rovnou zkopírujte s instrukcí do schránky pro ChatGPT.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 text-xs font-bold shadow-xs hover:bg-teal-50 dark:hover:bg-teal-900/40 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    <span>Stáhnout definici (.json)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    {copiedPrompt ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Prompt zkopírován!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopírovat pro ChatGPT</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-3 py-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{copiedJson ? 'JSON zkopírován' : 'Pouze čistý JSON'}</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Paste ChatGPT JSON to update */}
              <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                  <Bot className="w-4 h-4" />
                  <span>2. Aktualizace trasy vložením JSON z ChatGPT</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Vložte odpověď nebo kód JSON vygenerovaný z ChatGPT. Nové dny a místa nahradí současný itinerář této cesty (název a nastavení zůstávají zachovány).
                </p>

                <textarea
                  rows={8}
                  value={chatGptContent}
                  onChange={(e) => setChatGptContent(e.target.value)}
                  placeholder="Vložte text nebo JSON kód z ChatGPT (včetně ```json značek nebo úvodního textu)..."
                  className="w-full p-3 rounded-xl bg-white dark:bg-stone-900 border border-purple-200 dark:border-purple-800 text-xs font-mono text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />

                <button
                  type="button"
                  disabled={chatGptLoading || !chatGptContent.trim()}
                  onClick={handleApplyChatGpt}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {chatGptLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Aktualizovat trasu cesty z ChatGPT</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
