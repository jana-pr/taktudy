import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone, QrCode, Copy, CheckCircle2, Share2, PlusSquare } from 'lucide-react';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppModal: React.FC<MobileAppModalProps> = ({ isOpen, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const targetUrl = 'https://taktudy.onrender.com/';

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#006D77',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Chyba při generování QR kódu:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Do mobilu
              </span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Mobilní aplikace Tak tudy!
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
        <div className="py-5 flex flex-col items-center text-center space-y-4">
          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-teal-100 dark:border-teal-900">
            {qrUrl ? (
              <img src={qrUrl} alt="QR kód pro Tak tudy!" className="w-56 h-56 rounded-xl" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-gray-400 text-xs">
                Generuji QR kód...
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              Namiřte fotoaparát iPhonu nebo Androidu
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Odkaz se okamžitě otevře v prohlížeči vašeho telefonu
            </p>
          </div>

          {/* Copy Link pill */}
          <div className="w-full flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-xs">
            <span className="font-mono text-gray-600 dark:text-gray-300 truncate pr-2">
              {targetUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-1 shrink-0 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Zkopírováno</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopírovat</span>
                </>
              )}
            </button>
          </div>

          {/* iPhone Installation Tip */}
          <div className="w-full text-left p-3.5 bg-teal-50/70 dark:bg-teal-950/30 rounded-2xl border border-teal-200/60 dark:border-teal-900/40 text-xs space-y-1.5">
            <div className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              <span>Jak si aplikaci připnout na plochu iPhonu:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-teal-950/90 dark:text-teal-200 text-[11px]">
              <li>V <strong>Safari</strong> na iPhonu klepněte dole na tlačítko <strong>Sdílet</strong> (čtvereček se šipkou nahoru).</li>
              <li>Vyberte možnost <strong>„Přidat na plochu“</strong> (Add to Home Screen).</li>
              <li>Aplikace se bude spouštět na celou obrazovku jako plnohodnotná nativní aplikace.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs transition-colors"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
