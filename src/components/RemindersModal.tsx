import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Utensils,
  Ticket,
  Train,
  MapPin,
  AlertCircle,
  Smartphone,
  Check,
} from 'lucide-react';
import { FullTrip, Reminder } from '../types';
import { remindersApi } from '../api/client';
import { notificationService } from '../services/notificationService';

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: FullTrip;
  onRemindersUpdated?: (reminders: Reminder[]) => void;
}

export const RemindersModal: React.FC<RemindersModalProps> = ({
  isOpen,
  onClose,
  trip,
  onRemindersUpdated,
}) => {
  const [reminders, setReminders] = useState<Reminder[]>(trip.reminders || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'restaurant' | 'tickets' | 'transport' | 'activity' | 'general'>('general');
  const [remindDate, setRemindDate] = useState('');
  const [remindTime, setRemindTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Notification Test Feedback
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [permissionState, setPermissionState] = useState<string>('default');

  useEffect(() => {
    if (isOpen) {
      loadReminders();
      checkPermission();
    }
  }, [isOpen, trip.id]);

  const checkPermission = () => {
    setPermissionState(notificationService.getPermission());
  };

  const loadReminders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await remindersApi.getAll(trip.id);
      setReminders(data);
      if (onRemindersUpdated) {
        onRemindersUpdated(data);
      }
    } catch (err: any) {
      console.error('Chyba při načítání připomínek:', err);
      // Fallback to trip.reminders if offline/cached
      if (trip.reminders) {
        setReminders(trip.reminders);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleQuickTemplate = (
    tmplTitle: string,
    tmplCat: 'restaurant' | 'tickets' | 'transport' | 'activity' | 'general',
    tmplNotes: string
  ) => {
    setTitle(tmplTitle);
    setCategory(tmplCat);
    setNotes(tmplNotes);
    setShowAddForm(true);

    // Default to tomorrow or trip start date if available
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setRemindDate(d.toISOString().split('T')[0]);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindDate) {
      setError('Vyplňte prosím název a datum připomínky.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Combine date and time to ISO string
      const isoDateTime = new Date(`${remindDate}T${remindTime || '09:00'}:00`).toISOString();

      const created = await remindersApi.create(trip.id, {
        title: title.trim(),
        category,
        remind_at: isoDateTime,
        notes: notes.trim() || null,
        is_completed: false,
      });

      const updated = [...reminders, created].sort(
        (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
      );
      setReminders(updated);
      if (onRemindersUpdated) onRemindersUpdated(updated);

      // Request notification permission if not yet decided
      if (notificationService.getPermission() === 'default') {
        await notificationService.requestPermission();
        checkPermission();
      }

      // Reset form
      setTitle('');
      setCategory('general');
      setNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se uložit připomínku.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const updatedItem = await remindersApi.toggle(trip.id, id);
      const updated = reminders.map((r) => (r.id === id ? updatedItem : r));
      setReminders(updated);
      if (onRemindersUpdated) onRemindersUpdated(updated);
    } catch (err) {
      console.error('Chyba při změně stavu připomínky:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Opravdu chcete tuto připomínku smazat?')) return;
    try {
      await remindersApi.delete(trip.id, id);
      const updated = reminders.filter((r) => r.id !== id);
      setReminders(updated);
      if (onRemindersUpdated) onRemindersUpdated(updated);
    } catch (err) {
      console.error('Chyba při mazání připomínky:', err);
    }
  };

  const handleTestNotification = async () => {
    setTestResult(null);
    const res = await notificationService.sendTestNotification();
    setTestResult(res);
    checkPermission();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'restaurant':
        return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'tickets':
        return <Ticket className="w-4 h-4 text-purple-500" />;
      case 'transport':
        return <Train className="w-4 h-4 text-blue-500" />;
      case 'activity':
        return <MapPin className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-teal-500" />;
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'restaurant':
        return { label: 'Restaurace & Gastronomie', bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200' };
      case 'tickets':
        return { label: 'Lístky / Vstupenky', bg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200' };
      case 'transport':
        return { label: 'Jízdenky / Doprava', bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200' };
      case 'activity':
        return { label: 'Aktivita / Výlet', bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200' };
      default:
        return { label: 'Obecné', bg: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' };
    }
  };

  const pendingReminders = reminders.filter((r) => !r.is_completed);
  const completedReminders = reminders.filter((r) => r.is_completed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Připomínky k trase
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                  {trip.title}
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upozornění do telefonu na rezervace restaurací, lístky do divadla, jízdenky a další úkoly
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Notification Status & Phone Test Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-blue-500/10 border border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Notifikace v telefonu
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      permissionState === 'granted'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : permissionState === 'denied'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {permissionState === 'granted'
                      ? 'Aktivní'
                      : permissionState === 'denied'
                      ? 'Blokováno v prohlížeči'
                      : 'Vyžaduje potvrzení'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                  {permissionState === 'granted'
                    ? 'Telefon vám pošle zvukovou i vibrační notifikaci v nastavený čas.'
                    : 'Klikněte pro aktivaci a vyzkoušení upozornění na vašem zařízení.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleTestNotification}
              type="button"
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Otestovat notifikaci v telefonu</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {testResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Presets / Templates */}
          {!showAddForm && (
            <div>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Rychlé šablony úkolů k trase
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickTemplate(
                      'Rezervovat stůl v restauraci',
                      'restaurant',
                      'Rezervovat stůl pro vybraný večer s předstihem'
                    )
                  }
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-amber-400 dark:hover:border-amber-600 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-left transition-all flex items-center gap-2.5 group"
                >
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 group-hover:scale-110 transition-transform">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Rezervovat restauraci</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Předstih 2–7 dní před termínem</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickTemplate(
                      'Koupit lístky na představení / vstupenky',
                      'tickets',
                      'Zkontrolovat dostupnost a koupit lístky online'
                    )
                  }
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-400 dark:hover:border-purple-600 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-all flex items-center gap-2.5 group"
                >
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 group-hover:scale-110 transition-transform">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Lístky na představení / show</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Divadla, kulturní show, festivaly</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickTemplate(
                      'Koupit jízdenky na vlak / autobus',
                      'transport',
                      'Rezervovat místa v rychlíku nebo meziměstském spoji'
                    )
                  }
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-left transition-all flex items-center gap-2.5 group"
                >
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 group-hover:scale-110 transition-transform">
                    <Train className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Koupit jízdenky na dopravu</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Když se otevře prodej místenek</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickTemplate(
                      'Rezervovat průvodce / vstup do památky',
                      'activity',
                      'Potvrdit termín vstupu na konkrétní čas'
                    )
                  }
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all flex items-center gap-2.5 group"
                >
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 group-hover:scale-110 transition-transform">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Vstup do památky / Safari</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Časový slot pro návštěvu</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Add Form or Button */}
          {showAddForm ? (
            <form onSubmit={handleAddSubmit} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-teal-600" /> Nová připomínka
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Zrušit
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Co je třeba zařídit? *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Např. Rezervovat stůl v restauraci The Ministry of Crab"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                  >
                    <option value="restaurant">🍽️ Restaurace & Jídlo</option>
                    <option value="tickets">🎟️ Vstupenky / Divadlo</option>
                    <option value="transport">🚆 Jízdenky / Vlaky</option>
                    <option value="activity">🗺️ Aktivita / Výlet</option>
                    <option value="general">⏰ Ostatní připomínka</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Datum upozornění *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={remindDate}
                      onChange={(e) => setRemindDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Čas upozornění
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={remindTime}
                      onChange={(e) => setRemindTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Poznámka / Odkaz / Detail
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Např. Odkaz na webové stránky, telefon nebo počet osob"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Ukládám...' : 'Vytvořit připomínku'}</span>
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                const d = new Date();
                d.setDate(d.getDate() + 1);
                setRemindDate(d.toISOString().split('T')[0]);
              }}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-500 text-gray-500 hover:text-teal-600 font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-teal-50/50 dark:hover:bg-teal-950/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Přidat vlastní připomínku</span>
            </button>
          )}

          {/* Reminders List */}
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Nadcházející úkoly ({pendingReminders.length})</span>
                {loading && <span className="text-[10px] text-teal-600 animate-pulse">Aktualizuji...</span>}
              </div>

              {pendingReminders.length === 0 ? (
                <div className="text-center py-6 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/40 dark:bg-gray-800/20 text-xs text-gray-400">
                  Žádné čekající připomínky. Přidejte si připomínku tlačítkem výše.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingReminders.map((rem) => {
                    const badge = getCategoryBadge(rem.category);
                    const dt = new Date(rem.remind_at);
                    const dateFormatted = dt.toLocaleDateString('cs-CZ', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric',
                    });
                    const timeFormatted = dt.toLocaleTimeString('cs-CZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={rem.id}
                        className="p-3 sm:p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/80 hover:border-teal-300 dark:hover:border-teal-700 transition-all flex items-start justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggle(rem.id)}
                            className="mt-0.5 text-gray-400 hover:text-teal-600 transition-colors shrink-0"
                            title="Označit jako hotové"
                          >
                            <Circle className="w-5 h-5" />
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                                {rem.title}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.bg}`}>
                                {getCategoryIcon(rem.category)}
                                <span>{badge.label}</span>
                              </span>
                            </div>

                            {rem.notes && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 break-words">
                                {rem.notes}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                {dateFormatted}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-teal-600" />
                                {timeFormatted}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(rem.id)}
                          className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                          title="Smazat připomínku"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {completedReminders.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Vyřízené ({completedReminders.length})
                </div>
                <div className="space-y-1.5 opacity-60">
                  {completedReminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggle(rem.id)}
                          className="text-emerald-600 shrink-0"
                          title="Vrátit mezi aktivní"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <span className="line-through text-gray-500 truncate">{rem.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(rem.id)}
                        className="text-gray-400 hover:text-rose-600 p-1 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Připomínky jsou uloženy k této konkrétní cestě
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs transition-colors"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
