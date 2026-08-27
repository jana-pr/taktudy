import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Users,
  Car,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Compass,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { tripsApi } from '../api/client';

interface TripProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (tripId: string) => void;
}

export const TripProposalModal: React.FC<TripProposalModalProps> = ({
  isOpen,
  onClose,
  onTripCreated,
}) => {
  const [prompt, setPrompt] = useState(
    'Srí Lanka, 26. 12. 2026–10. 1. 2027, 3 dospělí, soukromý řidič, chceme přírodu, historii, pěší výlety a několik dní u moře.'
  );
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateProposal = async () => {
    if (!prompt.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await tripsApi.aiPropose(prompt);
      setProposal(res);
    } catch (err: any) {
      setError(err.message || 'Generování návrhu se nezdařilo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCreateTrip = async () => {
    if (!proposal) return;
    try {
      setLoading(true);
      // Create trip from proposal
      const newTrip = await tripsApi.create({
        title: proposal.title,
        motto: 'Plánuji, abych měla svobodu.',
        status: 'planning',
        startDate: proposal.start_date || '2026-12-26',
        endDate: proposal.end_date || '2027-01-10',
      });
      onTripCreated(newTrip.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se vytvořit cestu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                AI Asistent
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Navrhni mi trasu
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

        {/* Modal Body */}
        <div className="py-5 overflow-y-auto space-y-5 flex-1 pr-1">
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Prompt input if not yet generated or can be re-prompted */}
          {!proposal ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Popište svou představu o cestě:
                </label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Kam chcete jet, na jak dlouho, pro kolik osob, způsob dopravy, co chcete vidět..."
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                />
              </div>

              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-200">
                💡 <strong>Příklad:</strong> <em>Srí Lanka, 26. 12. 2026–10. 1. 2027, 3 dospělí, soukromý řidič, chceme přírodu, historii, pěší výlety a několik dní u moře.</em>
              </div>

              <button
                type="button"
                disabled={loading || !prompt.trim()}
                onClick={handleGenerateProposal}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generuji návrh cesty...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Vytvořit návrh cesty
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Proposal Confirmation Review */
            <div className="space-y-5 animate-fade-in">
              {/* Proposal Header Banner */}
              <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-teal-950 text-white p-5 sm:p-6 rounded-2xl shadow-md">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-purple-100">
                  Předběžný návrh ke schválení
                </span>
                <h3 className="text-xl sm:text-2xl font-bold mt-2">
                  {proposal.title}
                </h3>
                <p className="text-xs sm:text-sm text-purple-200 mt-1">
                  Destinace: <strong>{proposal.country_region}</strong> • {proposal.dates_str}
                </p>

                {/* 4 Pillars of Confirmation */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 text-xs">
                  <div className="bg-white/10 p-2.5 rounded-xl">
                    <div className="text-purple-200 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Počet dní
                    </div>
                    <div className="font-bold text-sm text-white mt-0.5">
                      {proposal.days_count} dní
                    </div>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl">
                    <div className="text-purple-200 flex items-center gap-1">
                      <Moon className="w-3.5 h-3.5" /> Počet nocí
                    </div>
                    <div className="font-bold text-sm text-white mt-0.5">
                      {proposal.nights_count} nocí
                    </div>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl">
                    <div className="text-purple-200 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Cestující
                    </div>
                    <div className="font-bold text-sm text-white mt-0.5">
                      {proposal.travelers_count} dospělí
                    </div>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl">
                    <div className="text-purple-200 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5" /> Doprava
                    </div>
                    <div className="font-bold text-sm text-white mt-0.5 truncate" title={proposal.primary_transport}>
                      {proposal.primary_transport}
                    </div>
                  </div>
                </div>
              </div>

              {/* Long Transit Warnings (Případné dlouhé přejezdy) */}
              {proposal.long_transit_warnings && proposal.long_transit_warnings.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    Upozornění na delší přejezdy na trase:
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    {proposal.long_transit_warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Day by Day Plan Preview */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Navržená posloupnost dní a hlavních zastávek:
                </div>
                {proposal.days?.map((d: any) => (
                  <div
                    key={d.day_number}
                    className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                      <span>Den {d.day_number}: {d.title}</span>
                      <span className="text-teal-600 dark:text-teal-400 font-medium">
                        {d.start_location} → {d.overnight_location}
                      </span>
                    </div>

                    <div className="text-gray-600 dark:text-gray-300">
                      <strong>Hlavní program:</strong> {d.main_activities?.join(', ') || 'Program dne'}
                    </div>

                    {d.optional_activities && d.optional_activities.length > 0 && (
                      <div className="text-purple-600 dark:text-purple-300">
                        <strong>Volitelně:</strong> {d.optional_activities.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          {proposal ? (
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              Upravit zadání
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Zrušit
            </button>

            {proposal && (
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmCreateTrip}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle2 className="w-4 h-4" />
                Potvrdit a vytvořit cestu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
