import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { tripsApi } from '../api/client';

interface ImportRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripImported: (tripId: string) => void;
}

export const ImportRouteModal: React.FC<ImportRouteModalProps> = ({
  isOpen,
  onClose,
  onTripImported,
}) => {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setFileContent(text);

      try {
        const previewResult = await tripsApi.importRoute(text, file.name, false);
        setPreview(previewResult);
      } catch (err: any) {
        setError(err.message || 'Chyba při čtení nebo analýze souboru.');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Nepodařilo se přečíst soubor.');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleAnalyzePastedText = async () => {
    if (!pastedText.trim()) return;
    setError(null);
    setLoading(true);
    setFileName('vlozeny-chatgpt-plan.json');
    setFileContent(pastedText);

    try {
      const previewResult = await tripsApi.importRoute(pastedText, 'vlozeny-chatgpt-plan.json', false);
      setPreview(previewResult);
    } catch (err: any) {
      setError(
        err.message ||
          'Chyba při analýze textu. Ujistěte se, že text obsahuje kód JSON vygenerovaný z ChatGPT.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!fileContent) return;

    try {
      setLoading(true);
      const res = await tripsApi.importRoute(fileContent, fileName || 'import.json', true);
      onTripImported(res.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se importovat trasu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Nová funkce
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              Importovat trasu
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs between File Upload vs Text Paste */}
        {!preview && (
          <div className="flex items-center gap-2 pt-4 border-b border-gray-100 dark:border-gray-700 pb-3">
            <button
              type="button"
              onClick={() => {
                setTab('upload');
                setError(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === 'upload'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nahrát soubor (JSON, GPX, KML)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('paste');
                setError(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === 'paste'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Vložit text z ChatGPT přímo</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="py-5 overflow-y-auto space-y-5 flex-1 pr-1">
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">Chyba při importu:</div>
                <p>{error}</p>
                <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                  💡 Tip: Můžete přepnout na záložku <strong>„Vložit text z ChatGPT přímo“</strong> a vložit text přímo bez ukládání do souboru.
                </div>
              </div>
            </div>
          )}

          {/* Mode 1: File Upload */}
          {!preview && tab === 'upload' && (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-teal-500 dark:hover:border-teal-400 rounded-3xl p-8 text-center transition-colors">
              <input
                type="file"
                id="route-file-input"
                accept=".gpx,.kml,.json,.geojson,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="route-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-inner">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    Vyberte soubor z počítače
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Podporované: <strong>JSON</strong>, <strong>GPX</strong>, <strong>KML</strong>, <strong>TXT</strong>
                  </div>
                </div>
                <span className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors">
                  Procházet soubory
                </span>
              </label>
            </div>
          )}

          {/* Mode 2: Direct Paste from ChatGPT */}
          {!preview && tab === 'paste' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Vložte zkopírovaný text nebo kód z ChatGPT:
              </label>
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={'Zde vložte text z ChatGPT (i včetně ```json ... ```). Aplikace si JSON sama automaticky najde a očistí.'}
                className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                disabled={loading || !pastedText.trim()}
                onClick={handleAnalyzePastedText}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Zkontrolovat a načíst trasu
              </button>
            </div>
          )}

          {/* Preview of Extracted Data */}
          {preview && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-teal-50/60 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 rounded-2xl">
                <div className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                  Rozpoznaná trasa:
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {preview.title}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300 mt-2">
                  <span>📅 <strong>{preview.days?.length || 1}</strong> dní</span>
                  <span>📍 <strong>{preview.pois?.length || 0}</strong> míst</span>
                  <span>🛣️ <strong>{preview.coordinates?.length || 0}</strong> GPS bodů křivky</span>
                </div>
              </div>

              {/* Data Transparency Info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs space-y-1.5">
                <div className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                  <span>Rozpoznaná data:</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 bg-white dark:bg-gray-800 border rounded text-gray-700 dark:text-gray-300">
                    Běžný text = Známý údaj ze souboru
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded flex items-center gap-1 font-medium">
                    <Sparkles className="w-2.5 h-2.5" /> Doplněno AI
                  </span>
                </div>
              </div>

              {/* POI preview list */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Nalezená místa (ukázka prvních 6):
                </div>
                {preview.pois?.slice(0, 6).map((p: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {p.name}
                      </span>
                      {p.why_visit && (
                        <div className="text-[11px] text-gray-500 truncate max-w-sm">
                          {p.why_visit}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Připraveno
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          {preview ? (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setFileContent('');
              }}
              className="text-xs text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300"
            >
              Zvolit jiný soubor
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
            {preview ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Vytvořit cestu z importu
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
