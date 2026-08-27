import React, { useState, useEffect } from 'react';
import { FullTrip, Booking } from '../types';
import {
  FileText,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Phone,
  Mail,
  Car,
  Train,
  Bed,
  Plane,
  Plus,
  Trash2,
  Edit2,
  X,
  Loader2,
  Sparkles,
  Ticket,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { bookingsApi } from '../api/client';

interface BookingsViewProps {
  trip: FullTrip;
  onTripUpdated?: () => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ trip, onTripUpdated }) => {
  const [bookings, setBookings] = useState<Booking[]>(trip.bookings || []);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [type, setType] = useState<string>('transport');
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [startDatetime, setStartDatetime] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState<'confirmed' | 'pending' | 'cancelled'>('confirmed');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [notes, setNotes] = useState('');

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingsApi.getAll(trip.id);
      setBookings(data);
    } catch (err) {
      console.error('Chyba načítání rezervací:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trip.bookings) {
      setBookings(trip.bookings);
    } else {
      loadBookings();
    }
  }, [trip.id]);

  const openAddModal = () => {
    setEditingBooking(null);
    setType('transport');
    setTitle('');
    setProvider('');
    setConfirmationNumber('');
    setBookingDate('');
    setStartDatetime('');
    setPrice('');
    setCurrency('USD');
    setStatus('confirmed');
    setContactPhone('');
    setContactEmail('');
    setDocumentUrl('');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bkg: Booking) => {
    setEditingBooking(bkg);
    setType(bkg.type);
    setTitle(bkg.title);
    setProvider(bkg.provider || '');
    setConfirmationNumber(bkg.confirmation_number || '');
    setBookingDate(bkg.booking_date || '');
    setStartDatetime(bkg.start_datetime || '');
    setPrice(bkg.price ? String(bkg.price) : '');
    setCurrency(bkg.currency || 'USD');
    setStatus(bkg.status || 'confirmed');
    setContactPhone(bkg.contact_phone || '');
    setContactEmail(bkg.contact_email || '');
    setDocumentUrl(bkg.document_url || '');
    setNotes(bkg.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setFormError(null);

    const payload: Partial<Booking> = {
      type: type as any,
      title: title.trim(),
      provider: provider.trim() || undefined,
      confirmation_number: confirmationNumber.trim() || undefined,
      booking_date: bookingDate || undefined,
      start_datetime: startDatetime || undefined,
      price: price ? parseFloat(price) : 0,
      currency: currency || 'USD',
      status,
      contact_phone: contactPhone.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      document_url: documentUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (editingBooking) {
        await bookingsApi.update(trip.id, editingBooking.id, payload);
      } else {
        await bookingsApi.create(trip.id, payload);
      }
      setIsModalOpen(false);
      await loadBookings();
      if (onTripUpdated) onTripUpdated();
    } catch (err: any) {
      setFormError(err.message || 'Nepodařilo se uložit rezervaci.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBooking = async (id: string, bookingTitle: string) => {
    if (!confirm(`Opravdu chcete smazat rezervaci „${bookingTitle}“?`)) return;
    try {
      await bookingsApi.delete(trip.id, id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      if (onTripUpdated) onTripUpdated();
    } catch (err: any) {
      alert(err.message || 'Nepodařilo se smazat rezervaci.');
    }
  };

  const getTypeIcon = (bookingType: string) => {
    switch (bookingType) {
      case 'transport':
        return <Car className="w-4 h-4 text-amber-600" />;
      case 'flight':
        return <Plane className="w-4 h-4 text-blue-600" />;
      case 'train':
        return <Train className="w-4 h-4 text-emerald-600" />;
      case 'activity':
        return <Ticket className="w-4 h-4 text-purple-600" />;
      case 'visa':
      case 'insurance':
        return <ShieldCheck className="w-4 h-4 text-teal-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeBadge = (bookingType: string) => {
    switch (bookingType) {
      case 'transport':
        return { label: 'Doprava / Auto', bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200' };
      case 'flight':
        return { label: 'Letenky', bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200' };
      case 'train':
        return { label: 'Vlaky', bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200' };
      case 'activity':
        return { label: 'Aktivita / Safari', bg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200' };
      case 'visa':
        return { label: 'Víza', bg: 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200' };
      case 'insurance':
        return { label: 'Pojištění', bg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200' };
      default:
        return { label: 'Ostatní voucher', bg: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' };
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedFilter === 'all') return true;
    return b.type === selectedFilter;
  });

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
            <FileText className="w-4 h-4" /> Vouchery, jízdenky a smlouvy
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Přehled všech rezervací cesty
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Všechna rezervační čísla, kontakty, letenky a smlouvy na jednom místě
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Přidat rezervaci / voucher</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: `Všechny (${bookings.length})` },
          { id: 'transport', label: '🚗 Doprava' },
          { id: 'flight', label: '✈️ Letenky' },
          { id: 'train', label: '🚂 Vlaky' },
          { id: 'activity', label: '🎟️ Aktivity & Výlety' },
          { id: 'visa', label: '📋 Víza & Pojištění' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 ${
              selectedFilter === f.id
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Načítám rezervace...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-16 p-8 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 space-y-3">
          <FileText className="w-10 h-10 text-teal-600 mx-auto" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Žádné rezervace v této kategorii
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Uložte si čísla smluv, jízdenek nebo letenek, ať je máte na cestách po ruce i offline.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat rezervaci</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((bkg) => {
            const badge = getTypeBadge(bkg.type);
            const icon = getTypeIcon(bkg.type);

            return (
              <div
                key={bkg.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${badge.bg}`}>
                        {icon}
                        <span>{badge.label}</span>
                      </span>

                      {bkg.status === 'confirmed' && (
                        <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Potvrzeno
                        </span>
                      )}

                      {bkg.confirmation_number && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-full font-mono font-bold">
                          Kód: {bkg.confirmation_number}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                      {bkg.title}
                    </h3>

                    {bkg.provider && (
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Poskytovatel: <span className="font-semibold">{bkg.provider}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2">
                    {bkg.price !== undefined && bkg.price > 0 ? (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          ${bkg.price}{' '}
                          <span className="text-xs font-normal text-gray-500">
                            {bkg.currency || 'USD'}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(bkg)}
                        title="Upravit rezervaci"
                        className="p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBooking(bkg.id, bkg.title)}
                        title="Smazat rezervaci"
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {bkg.notes && (
                  <div className="mt-3.5 p-3 bg-stone-50 dark:bg-stone-750/50 border border-stone-200/60 dark:border-stone-700/60 rounded-xl text-xs text-gray-700 dark:text-gray-300">
                    {bkg.notes}
                  </div>
                )}

                {(bkg.contact_phone || bkg.contact_email || bkg.document_url) && (
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs">
                    {bkg.contact_phone && (
                      <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        <span>{bkg.contact_phone}</span>
                      </div>
                    )}

                    {bkg.contact_email && (
                      <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <Mail className="w-3.5 h-3.5 text-teal-600" />
                        <span>{bkg.contact_email}</span>
                      </div>
                    )}

                    {bkg.document_url && (
                      <a
                        href={bkg.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold hover:underline"
                      >
                        <span>Otevřít doklad / web</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingBooking ? 'Upravit rezervaci' : 'Nová rezervace / doklad'}
                  </h3>
                  <p className="text-xs text-gray-500">{trip.title}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 my-2 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveBooking} className="space-y-4 py-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Typ položky *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="transport">🚗 Doprava / Auto s řidičem</option>
                    <option value="flight">✈️ Letenka</option>
                    <option value="train">🚂 Vlaková jízdenka</option>
                    <option value="activity">🎟️ Vstupenka / Safari / Výlet</option>
                    <option value="visa">📋 Vízum (ETA)</option>
                    <option value="insurance">🛡️ Cestovní pojištění</option>
                    <option value="other">📍 Jiný voucher</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Stav rezervace
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="confirmed">Potvrzeno (Zaplaceno)</option>
                    <option value="pending">Čeká na potvrzení / platbu</option>
                    <option value="cancelled">Zrušeno</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Název rezervace / Služby *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Např. Letenky Praha-Colombo s Qatar Airways..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Poskytovatel / Společnost
                  </label>
                  <input
                    type="text"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="Např. Qatar Airways, Lanka Travel..."
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Rezervační kód / PNR
                  </label>
                  <input
                    type="text"
                    value={confirmationNumber}
                    onChange={(e) => setConfirmationNumber(e.target.value)}
                    placeholder="Např. PNR-7890XYZ"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Cena celkem ($ USD)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Např. 855"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Datum / Čas akce
                  </label>
                  <input
                    type="text"
                    value={startDatetime}
                    onChange={(e) => setStartDatetime(e.target.value)}
                    placeholder="Např. 26. 12. 2026 v 09:15"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Telefonní kontakt
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    E-mail kontakt
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="info@poskytovatel.com"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Odkaz na doklad / web
                </label>
                <input
                  type="url"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Poznámky / Rozsah sjednané služby
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Co rezervace zahrnuje, podmínky zrušení, instrukce pro předání..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 font-semibold"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{editingBooking ? 'Uložit změny' : 'Vytvořit rezervaci'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
