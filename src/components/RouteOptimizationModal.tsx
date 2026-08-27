import React, { useState } from 'react';
import { X, Sparkles, Compass, CheckCircle2, ArrowRight, Clock, MapPin, Loader2 } from 'lucide-react';
import { tripsApi } from '../api/client';

interface RouteOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  onApplyOptimization?: () => void;
}

export const RouteOptimizationModal: React.FC<RouteOptimizationModalProps> = ({
  isOpen,
  onClose,
  tripId,
  onApplyOptimization,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setLoading(true);
      tripsApi
        .optimizeRoute(tripId)
        .then((res) => {
          setResult(res);
        })
        .catch((err) => {
          console.error('Chyba optimalizace:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setResult(null);
    }
  }, [isOpen, tripId]);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (onApplyOptimization) onApplyOptimization();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Chytrá analýza trasy
              </span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Optimalizovat trasu
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
        <div className="py-5 space-y-4">
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Počítám vzdálenosti, časové přejezdy a polohy noclehů...
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-800 dark:text-teal-300">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  Doporučená změna pořadí
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white mt-1">
                  {result.title}
                </h3>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">
                  {result.recommendation_text}
                </p>

                {result.distance_saved_km > 0 && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-teal-200/60 dark:border-teal-900/40 text-xs font-semibold text-teal-800 dark:text-teal-200">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Úspora: ~{result.distance_saved_km} km
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Čas za volantem: -{result.time_saved_min} min
                    </span>
                  </div>
                )}
              </div>

              {result.suggested_changes?.map((c: any, i: number) => (
                <div
                  key={i}
                  className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">{c.poi_name}</span>
                    <div className="text-[11px] text-gray-500">{c.explanation}</div>
                  </div>

                  <div className="flex items-center gap-1.5 font-semibold text-teal-600 dark:text-teal-400 shrink-0">
                    <span>Den {c.from_day}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="text-emerald-600 dark:text-emerald-400">Den {c.to_day}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons: Přijmout | Ignorovat */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Ignorovat
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Přijmout doporučení
          </button>
        </div>
      </div>
    </div>
  );
};
