import React, { useState } from 'react';
import { POI, Category, Stage, Day } from '../types';
import { compressImageFile, CATEGORY_PHOTO_PRESETS } from '../utils/imageCompressor';
import {
  X,
  Star,
  Clock,
  MapPin,
  ExternalLink,
  Navigation,
  Edit2,
  Trash2,
  CheckCircle2,
  FileText,
  Lock,
  Calendar,
  Layers,
  Camera,
  Image as ImageIcon,
  Globe,
  DollarSign,
} from 'lucide-react';

interface PoiDetailModalProps {
  poi: POI | null;
  categories: Category[];
  stages?: Stage[];
  days?: Day[];
  isOpen: boolean;
  onClose: () => void;
  onToggleTop: (poiId: string) => void;
  onToggleVisit: (poiId: string, currentStatus: string) => void;
  onDeletePoi: (poiId: string) => void;
  onSaveEdit: (poiId: string, updatedData: Partial<POI>) => void;
  isReadOnly?: boolean;
}

export const PoiDetailModal: React.FC<PoiDetailModalProps> = ({
  poi,
  categories,
  stages = [],
  days = [],
  isOpen,
  onClose,
  onToggleTop,
  onToggleVisit,
  onDeletePoi,
  onSaveEdit,
  isReadOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editTimeMode, setEditTimeMode] = useState<'none' | 'approximate' | 'fixed'>('none');
  const [editStageId, setEditStageId] = useState('');
  const [editDayId, setEditDayId] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editSourceUrl, setEditSourceUrl] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editWhyVisit, setEditWhyVisit] = useState('');
  const [editCostEst, setEditCostEst] = useState<number | string>(0);
  const [editRecommendedDuration, setEditRecommendedDuration] = useState('');

  if (!isOpen || !poi) return null;

  const category = categories.find((c) => c.id === poi.category_id);
  const isVisited = poi.visit_status === 'visited';

  const handleStartEdit = () => {
    setEditName(poi.name);
    setEditDesc(poi.description || '');
    setEditNotes(poi.private_notes || '');
    setEditHours(poi.opening_hours || '');
    setEditTime(poi.target_time || '');
    setEditTimeMode(poi.time_mode);
    setEditStageId(poi.stage_id || '');
    setEditDayId(poi.day_id || '');
    setEditPhotoUrl(poi.main_photo_url || '');
    setEditSourceUrl(poi.source_url || '');
    setEditCategoryId(poi.category_id || 'other');
    setEditWhyVisit(poi.why_visit || '');
    setEditCostEst(poi.cost_est ?? 0);
    setEditRecommendedDuration(poi.recommended_duration || '');
    setIsEditing(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setEditPhotoUrl(compressed);
    } catch (err: any) {
      alert(err.message || 'Nepodařilo se zpracovat fotografii.');
    }
  };

  const handleSave = () => {
    onSaveEdit(poi.id, {
      name: editName,
      description: editDesc,
      private_notes: editNotes,
      opening_hours: editHours,
      target_time: editTime,
      time_mode: editTimeMode,
      stage_id: editStageId || null,
      day_id: editDayId || null,
      main_photo_url: editPhotoUrl || null,
      source_url: editSourceUrl || null,
      category_id: editCategoryId || poi.category_id,
      why_visit: editWhyVisit || null,
      cost_est: typeof editCostEst === 'number' ? editCostEst : parseFloat(String(editCostEst)) || 0,
      recommended_duration: editRecommendedDuration || null,
    });
    setIsEditing(false);
  };

  // Open in external navigation (Google Maps / Apple Maps)
  const openExternalNav = () => {
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const url = isIos
      ? `maps://?q=${encodeURIComponent(poi.name)}&ll=${poi.lat},${poi.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-outdoor-dark-card w-full sm:max-w-xl max-h-[90vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom duration-200">
        {/* Photo Header */}
        <div className="relative h-48 sm:h-60 w-full bg-stone-200 dark:bg-stone-800 flex-shrink-0">
          <img
            src={
              poi.main_photo_url ||
              'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'
            }
            alt={poi.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur transition-all"
            aria-label="Zavřít detail"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top & Category Badges & Change Photo Button on Photo */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-outdoor-teal text-white shadow">
                {category?.label_cs || 'Bod zájmu'}
              </span>
              <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-white mt-1 drop-shadow-md">
                {poi.name}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Change photo button directly on cover */}
              {!isReadOnly && !isEditing && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-black/60 hover:bg-black/80 text-white backdrop-blur shadow-md transition-all active:scale-95"
                  title="Změnit fotografii tohoto místa"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Změnit foto</span>
                </button>
              )}

              {/* TOP Badge & Toggle */}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => onToggleTop(poi.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-lg transition-transform active:scale-95 ${
                    poi.is_top
                      ? 'bg-outdoor-top text-white ring-2 ring-white'
                      : 'bg-white/90 text-stone-700 hover:bg-white'
                  }`}
                  title={poi.is_top ? 'Odebrat z TOP' : 'Nastavit jako TOP'}
                >
                  <Star className={`w-4 h-4 ${poi.is_top ? 'fill-white' : 'text-stone-400'}`} />
                  <span>TOP</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {isEditing ? (
            /* Editing Form */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Název místa *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-stone-800 dark:border-stone-700"
                />
              </div>

              {/* Photo Upload & Preview Section */}
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2">
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                  Fotografie bodu zájmu
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editPhotoUrl}
                    onChange={(e) => setEditPhotoUrl(e.target.value)}
                    placeholder="URL odkaz na fotku nebo nahrajte z mobilu..."
                    className="flex-1 px-3 py-2 border rounded-lg text-xs dark:bg-stone-900 dark:border-stone-700"
                  />
                  <label
                    className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white cursor-pointer font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                    title="Nahrát fotku z mobilu nebo fotoaparátu"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Nahrát foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {editPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setEditPhotoUrl('')}
                      className="p-2 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 shrink-0"
                      title="Odebrat fotografii"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Photo thumbnail */}
                {editPhotoUrl && (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 mt-2">
                    <img src={editPhotoUrl} alt="Náhled fotky" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Presets */}
                {CATEGORY_PHOTO_PRESETS[editCategoryId || poi.category_id] && !editPhotoUrl && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-stone-400 font-medium">Doporučené:</span>
                    {CATEGORY_PHOTO_PRESETS[editCategoryId || poi.category_id].map((pr) => (
                      <button
                        key={pr.url}
                        type="button"
                        onClick={() => setEditPhotoUrl(pr.url)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200/60 font-medium"
                      >
                        {pr.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category, Cost & Web link */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Kategorie</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs dark:bg-stone-800 dark:border-stone-700 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label_cs}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Vstupné / Cena (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editCostEst}
                    onChange={(e) => setEditCostEst(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg text-xs dark:bg-stone-800 dark:border-stone-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Doba návštěvy</label>
                  <input
                    type="text"
                    value={editRecommendedDuration}
                    onChange={(e) => setEditRecommendedDuration(e.target.value)}
                    placeholder="např. 2 hod"
                    className="w-full px-3 py-2 border rounded-lg text-xs dark:bg-stone-800 dark:border-stone-700 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Web / Rezervační odkaz (URL)</label>
                <input
                  type="url"
                  value={editSourceUrl}
                  onChange={(e) => setEditSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border rounded-lg text-xs dark:bg-stone-800 dark:border-stone-700 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Režim času</label>
                  <select
                    value={editTimeMode}
                    onChange={(e: any) => setEditTimeMode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-stone-800 dark:border-stone-700"
                  >
                    <option value="none">Bez času</option>
                    <option value="approximate">Orientační čas</option>
                    <option value="fixed">Pevný čas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Čas (např. 14:30)</label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    placeholder="14:30"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-stone-800 dark:border-stone-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Zařazení do etapy</label>
                  <select
                    value={editStageId}
                    onChange={(e) => setEditStageId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs dark:bg-stone-800 dark:border-stone-700 font-medium"
                  >
                    <option value="">Bez etapy (celá cesta)</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">Zařazení do dne</label>
                  <select
                    value={editDayId}
                    onChange={(e) => setEditDayId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs dark:bg-stone-800 dark:border-stone-700 font-medium"
                  >
                    <option value="">Bez konkrétního dne</option>
                    {days.map((d) => (
                      <option key={d.id} value={d.id}>
                        Den {d.day_number}: {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Proč sem jedu / Popis</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-stone-800 dark:border-stone-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Moje soukromé poznámky</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-stone-800 dark:border-stone-700"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm rounded-lg border dark:border-stone-700"
                >
                  Zrušit
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 text-sm rounded-lg bg-outdoor-teal text-white font-bold"
                >
                  Uložit změny
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              {/* Timing info */}
              {poi.time_mode !== 'none' && poi.target_time && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl ${
                    poi.time_mode === 'fixed'
                      ? 'bg-outdoor-coral/10 border border-outdoor-coral/30 text-outdoor-coral dark:text-outdoor-top font-black'
                      : 'bg-stone-100 dark:bg-stone-800/80 text-outdoor-text-secondary dark:text-stone-300 font-semibold'
                  } text-sm`}
                >
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Čas:{' '}
                    <strong className="text-base font-extrabold">{poi.target_time}</strong>
                    {poi.time_mode === 'fixed' ? ' (Pevný čas události)' : ' (Orientační čas)'}
                  </span>
                </div>
              )}

              {/* Stage & Day assignment badge */}
              {(poi.stage_id || poi.day_id) && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {poi.stage_id && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold">
                      <Layers className="w-3.5 h-3.5 text-outdoor-teal" />
                      <span>Etapa: {stages.find((s) => s.id === poi.stage_id)?.title || 'Přiřazeno'}</span>
                    </span>
                  )}
                  {poi.day_id && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-outdoor-coral" />
                      <span>{days.find((d) => d.id === poi.day_id)?.title || 'Přiřazený den'}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Address / Opening Hours */}
              <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                {poi.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                    <span>{poi.address}</span>
                  </div>
                )}
                {poi.opening_hours && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                    <span>Otevírací doba: {poi.opening_hours}</span>
                  </div>
                )}
              </div>

              {/* Badges Bar: Mandatory, Duration, Cost, Origin */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {poi.is_mandatory ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                    ★ Povinné místo
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
                    Volitelné místo
                  </span>
                )}

                {poi.recommended_duration && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {poi.recommended_duration}
                  </span>
                )}

                {poi.cost_est ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
                    ${poi.cost_est} USD
                  </span>
                ) : null}

                {poi.data_origin === 'ai_completed' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 flex items-center gap-1">
                    Doplněno AI
                  </span>
                )}

                {poi.data_origin === 'needs_completion' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                    Je třeba doplnit
                  </span>
                )}
              </div>

              {/* Proč tam jet / Description Block */}
              {(poi.why_visit || poi.description) && (
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-outdoor-teal mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Proč tam jet / Popis místa</span>
                  </div>
                  <p className="text-sm text-outdoor-text dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                    {poi.why_visit || poi.description}
                  </p>
                </div>
              )}

              {/* Private Notes Block (Strictly separate!) */}
              {poi.private_notes && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Moje osobní poznámky</span>
                  </div>
                  <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                    {poi.private_notes}
                  </p>
                </div>
              )}

              {/* External URL link */}
              {poi.source_url && (
                <div>
                  <a
                    href={poi.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-outdoor-teal hover:underline"
                  >
                    <span>Otevřít původní odkaz / web místa</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                {/* External navigation */}
                <button
                  onClick={openExternalNav}
                  className="flex-1 py-3 px-4 rounded-xl bg-outdoor-teal hover:bg-outdoor-teal-dark active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Navigovat na místo</span>
                </button>

                {/* Visit status toggle */}
                {!isReadOnly && (
                  <button
                    onClick={() => onToggleVisit(poi.id, poi.visit_status)}
                    className={`py-3 px-4 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all ${
                      isVisited
                        ? 'bg-outdoor-positive/10 border-outdoor-positive text-outdoor-positive'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isVisited ? 'Navštíveno ✓' : 'Označit navštíveno'}</span>
                  </button>
                )}

                {/* Edit */}
                {!isReadOnly && (
                  <button
                    onClick={handleStartEdit}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 transition-colors"
                    title="Upravit bod"
                    aria-label="Upravit bod"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}

                {/* Delete */}
                {!isReadOnly && (
                  <button
                    onClick={() => {
                      if (confirm(`Opravdu si přejete smazat bod "${poi.name}"?`)) {
                        onDeletePoi(poi.id);
                        onClose();
                      }
                    }}
                    className="p-3 rounded-xl border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Smazat bod"
                    aria-label="Smazat bod"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
