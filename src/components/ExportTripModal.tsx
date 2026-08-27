import React, { useState } from 'react';
import { FullTrip } from '../types';
import { X, Copy, CheckCircle2, Download, Bot, FileCode, Sparkles } from 'lucide-react';

interface ExportTripModalProps {
  trip: FullTrip | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportTripModal: React.FC<ExportTripModalProps> = ({ trip, isOpen, onClose }) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen || !trip) return null;

  // Build clean JSON representation of trip
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
      // Find day number from day_id
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
[ZDE NAPIŠ SVÉ POŽADAVKY NA ÚPRAVU - NAPŘ. PŘIDEJ 1 DEN U MOŘE V MIRISSE, ZMĚŇ ZASTÁVKU V KANDY NEBO DOPORUČ JINÉ RESTAURACE...]

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
    a.download = `${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-itinerar.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Obousměrná práce s AI
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Exportovat trasu pro ChatGPT
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
            Tento text obsahuje celou vaši aktuální trasu (všech <strong>{trip.days?.length || 0}</strong> dní a <strong>{trip.pois?.length || 0}</strong> míst) spolu s instrukcí pro ChatGPT. Stačí zkopírovat, vložit do ChatGPT a zadat, co si přejete upravit.
          </p>

          {/* Prompt Preview Box */}
          <div className="relative">
            <pre className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-[11px] font-mono text-gray-800 dark:text-gray-200 max-h-72 overflow-y-auto whitespace-pre-wrap select-all">
              {chatGptPrompt}
            </pre>
          </div>

          <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/40 rounded-2xl text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p>
              <strong>Jak to funguje:</strong> Po úpravě v ChatGPT jednoduše zkopírujte odpověď a v aplikaci klikněte na <strong>„Upravit trasu z ChatGPT“</strong>. Nový plán nahradí dny a místa v této cestě.
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copiedJson ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <FileCode className="w-3.5 h-3.5" />}
              <span>{copiedJson ? 'JSON zkopírován' : 'Pouze JSON'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadFile}
              className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Stáhnout .json</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              {copiedPrompt ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Zkopírováno do schránky!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Kopírovat pro ChatGPT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
