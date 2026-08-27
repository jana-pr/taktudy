import React, { useState } from 'react';
import { POI, Category, Stage, Day } from '../types';
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
    setIsEditing(true);
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

          {/* Top & Category Badges on Photo */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-outdoor-teal text-white shadow">
                {category?.label_cs || 'Bod zájmu'}
              </span>
              <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-white mt-1 drop-shadow-md">
                {poi.name}
              </h1>
            </div>

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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {isEditing ? (
            /* Editing Form */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Název místa</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-stone-800 dark:border-stone-700"
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

              {/* Description Block */}
              {poi.description && (
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-outdoor-teal mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Proč sem jedu / Popis místa</span>
                  </div>
                  <p className="text-sm text-outdoor-text dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                    {poi.description}
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
