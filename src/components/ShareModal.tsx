import React, { useState, useEffect } from 'react';
import { FullTrip } from '../types';
import { shareApi } from '../api/client';
import { X, Share2, Copy, Check, QrCode, ShieldAlert, Lock } from 'lucide-react';

interface ShareModalProps {
  trip: FullTrip;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ trip, isOpen, onClose }) => {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch or generate share token
    const initShare = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await shareApi.generate(trip.id, includeNotes);
        setShareToken(res.token);
      } catch (err: any) {
        setError(err.message || 'Nepodařilo se vygenerovat odkaz pro sdílení.');
      } finally {
        setIsLoading(false);
      }
    };

    initShare();
  }, [isOpen, trip.id, includeNotes]);

  if (!isOpen) return null;

  const shareUrl = shareToken
    ? `${window.location.origin}/#share=${shareToken}`
    : '';

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!confirm('Opravdu chcete zrušit veřejný odkaz? Příjemci ztratí k cestě přístup.')) return;
    try {
      await shareApi.revoke(trip.id);
      setShareToken(null);
      alert('Sdílení cesty bylo zrušeno.');
      onClose();
    } catch (err: any) {
      alert('Chyba: ' + err.message);
    }
  };

  // Generate simple SVG QR Code URL using free reliable QR renderer
  const qrCodeUrl = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-outdoor-dark-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-outdoor-coral/10 text-outdoor-coral">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg text-outdoor-text dark:text-white">
                Sdílet konkrétní cestu
              </h2>
              <p className="text-xs text-outdoor-text-secondary dark:text-stone-400">
                Pouze pro čtení (Read-only)
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

        <div className="p-5 space-y-4">
          {/* Privacy Note */}
          <div className="p-3 bg-stone-50 dark:bg-stone-900/40 rounded-xl border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-outdoor-teal flex-shrink-0 mt-0.5" />
            <span>
              Příjemce získá přístup <strong>výhradně k této jedné cestě</strong>. Neuvidí žádné jiné tvé cesty ani tvůj profil a nemůže nic smazat ani změnit.
            </span>
          </div>

          {/* Include notes toggle */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-semibold text-outdoor-text dark:text-stone-200">
                Zahrnout moje osobní poznámky
              </span>
            </div>
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              className="rounded text-outdoor-teal focus:ring-outdoor-teal w-4 h-4"
            />
          </label>

          {/* QR Code */}
          {shareToken && (
            <div className="flex flex-col items-center justify-center p-4 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800">
              <img
                src={qrCodeUrl}
                alt="QR Kód pro sdílení cesty"
                className="w-40 h-40 rounded-xl bg-white p-2 shadow-sm border"
              />
              <span className="text-[11px] text-stone-400 font-medium mt-2">
                Naskenuj fotoaparátem v mobilu
              </span>
            </div>
          )}

          {/* Copy Link Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-500">
              Bezpečný unguessable odkaz
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-xs bg-stone-100 dark:bg-stone-800 border rounded-xl font-mono text-stone-600 dark:text-stone-300 select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 bg-outdoor-teal hover:bg-outdoor-teal-dark active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Zkopírováno' : 'Kopírovat'}</span>
              </button>
            </div>
          </div>

          {/* Revoke button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRevoke}
              className="w-full py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-transparent hover:border-red-200 transition-colors"
            >
              Zrušit existující odkaz a zneplatnit sdílení
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
