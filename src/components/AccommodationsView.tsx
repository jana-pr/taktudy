import React, { useState } from 'react';
import { FullTrip, Accommodation } from '../types';
import {
  Bed,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Users,
  DollarSign,
  Coffee,
  ShieldCheck,
  FileText,
  Plus,
  Trash2,
  Edit2,
  X,
  Loader2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { tripsApi, accommodationsApi } from '../api/client';

interface AccommodationsViewProps {
  trip: FullTrip;
  onTripUpdated?: () => void;
}

export const AccommodationsView: React.FC<AccommodationsViewProps> = ({
  trip,
  onTripUpdated,
}) => {
  const accommodations = trip.accommodations || [];
  const days = trip.days || [];
  const [scenario, setScenario] = useState<'2+1' | 'triple'>(trip.room_scenario || '2+1');
  const [savingScenario, setSavingScenario] = useState(false);

  // Modal State for Add / Edit Accommodation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<Accommodation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [hotelName, setHotelName] = useState('');
  const [dayId, setDayId] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [priceTotal, setPriceTotal] = useState('130');
  const [priceSingle, setPriceSingle] = useState('95');
  const [roomType, setRoomType] = useState('Standard Room');
  const [roomsCount, setRoomsCount] = useState('2');
  const [breakfastIncluded, setBreakfastIncluded] = useState(true);
  const [bookingUrl, setBookingUrl] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('Bezplatné storno');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingAcc(null);
    setHotelName('');
    setDayId(days[0]?.id || '');
    setLocation('');
    setLat('');
    setLng('');
    setPriceTotal('130');
    setPriceSingle('95');
    setRoomType('Cottage / Deluxe Room');
    setRoomsCount('2');
    setBreakfastIncluded(true);
    setBookingUrl('');
    setBookingReference('');
    setCancellationPolicy('Zdarma do týdne před příjezdem');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: Accommodation) => {
    setEditingAcc(acc);
    setHotelName(acc.hotel_name);
    setDayId(acc.day_id || '');
    setLocation(acc.location || '');
    setLat(acc.lat ? String(acc.lat) : '');
    setLng(acc.lng ? String(acc.lng) : '');
    setPriceTotal(String(acc.price_total || 0));
    setPriceSingle(String(acc.price_single || 0));
    setRoomType(acc.room_type || '');
    setRoomsCount(String(acc.rooms_count || 2));
    setBreakfastIncluded(Boolean(acc.breakfast_included));
    setBookingUrl(acc.booking_url || '');
    setBookingReference(acc.booking_reference || '');
    setCancellationPolicy(acc.cancellation_policy || '');
    setNotes(acc.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveAccommodation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelName.trim()) return;

    setSubmitting(true);
    setFormError(null);

    const payload: Partial<Accommodation> = {
      hotel_name: hotelName.trim(),
      day_id: dayId || null,
      location: location.trim() || undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      price_total: parseFloat(priceTotal) || 0,
      price_single: parseFloat(priceSingle) || 0,
      room_type: roomType.trim() || undefined,
      rooms_count: parseInt(roomsCount) || 2,
      breakfast_included: breakfastIncluded,
      booking_url: bookingUrl.trim() || undefined,
      booking_reference: bookingReference.trim() || undefined,
      cancellation_policy: cancellationPolicy.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (editingAcc) {
        await accommodationsApi.update(trip.id, editingAcc.id, payload);
      } else {
        await accommodationsApi.create(trip.id, payload);
      }
      setIsModalOpen(false);
      if (onTripUpdated) onTripUpdated();
    } catch (err: any) {
      setFormError(err.message || 'Nepodařilo se uložit ubytování.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccommodation = async (id: string, name: string) => {
    if (!confirm(`Opravdu chcete odstranit ubytování „${name}“?`)) return;
    try {
      await accommodationsApi.delete(trip.id, id);
      if (onTripUpdated) onTripUpdated();
    } catch (err: any) {
      alert(err.message || 'Nepodařilo se smazat ubytování.');
    }
  };

  const handleScenarioChange = async (newScenario: '2+1' | 'triple') => {
    setScenario(newScenario);
    try {
      setSavingScenario(true);
      await tripsApi.setRoomScenario(trip.id, newScenario);
      if (onTripUpdated) onTripUpdated();
    } catch (err) {
      console.error('Chyba při ukládání scénáře pokojů:', err);
    } finally {
      setSavingScenario(false);
    }
  };

  const totalAccCost = accommodations.reduce((sum, acc) => {
    if (scenario === '2+1') {
      return sum + (acc.price_total || 0);
    } else {
      const triplePrice = Math.round((acc.price_total || 0) * 0.75);
      return sum + triplePrice;
    }
  }, 0);

  const perPersonCostDouble = Math.round(
    accommodations.reduce((sum, acc) => {
      const doubleRoomPrice = (acc.price_total || 0) - (acc.price_single || 0);
      return sum + doubleRoomPrice / 2;
    }, 0)
  );

  const perPersonCostSingle = Math.round(
    accommodations.reduce((sum, acc) => {
      return sum + (acc.price_single || Math.round((acc.price_total || 0) * 0.45));
    }, 0)
  );

  const perPersonCostTriple = Math.round(totalAccCost / 3);

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto animate-fade-in">
      {/* Header & Scenario Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Bed className="w-4 h-4" /> Ubytování a hotely
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Rozpis {accommodations.length} noclehů
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Přepínejte mezi variantami pokojů nebo přidejte další ubytování
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Add Accommodation Button */}
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-2xl text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Přidat ubytování</span>
            </button>

            {/* Room Scenario Toggle */}
            <div className="bg-gray-100 dark:bg-gray-700/60 p-1.5 rounded-2xl flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleScenarioChange('2+1')}
                disabled={savingScenario}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  scenario === '2+1'
                    ? 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                Varianta A: 2 + 1
              </button>
              <button
                onClick={() => handleScenarioChange('triple')}
                disabled={savingScenario}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  scenario === 'triple'
                    ? 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                Varianta B: Pro 3
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="bg-teal-50/60 dark:bg-teal-950/20 p-4 rounded-2xl border border-teal-100 dark:border-teal-900/40">
            <div className="text-xs font-medium text-teal-700 dark:text-teal-300">
              Celkem za ubytování ({accommodations.length} nocí)
            </div>
            <div className="text-2xl font-bold text-teal-900 dark:text-teal-100 mt-1">
              ${totalAccCost.toLocaleString()}{' '}
              <span className="text-xs font-normal text-teal-600 dark:text-teal-400">USD</span>
            </div>
            <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-0.5">
              {scenario === '2+1' ? '2 pokoje (1× dvoulůžkový + 1× single)' : '1× třílůžkový pokoj'}
            </div>
          </div>

          {scenario === '2+1' ? (
            <>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Cena / osoba na 2-lůžkovém pokoji
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ${perPersonCostDouble.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-gray-500">USD</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Pro každého ze 2 cestujících na společném pokoji
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Cena pro 1 osobu na Single pokoji
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ${perPersonCostSingle.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-gray-500">USD</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Vlastní samostatný pokoj na celou dobu pobytu
                </div>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Cena za osobu (třílůžkový pokoj)
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ${perPersonCostTriple.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-gray-500">USD / os.</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Celkové hotelové náklady rozpočítané rovným dílem mezi 3 osoby
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accommodations List */}
      <div className="space-y-4">
        {accommodations.length === 0 ? (
          <div className="text-center py-16 p-8 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 space-y-3">
            <Bed className="w-10 h-10 text-teal-600 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Zatím nemáte přidané žádné ubytování
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Přidejte hotely a resorty pro jednotlivé dny své cesty.
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Přidat první ubytování</span>
            </button>
          </div>
        ) : (
          accommodations.map((acc, index) => {
            const price =
              scenario === '2+1'
                ? acc.price_total
                : Math.round(acc.price_total * 0.75);

            const dayObj = days.find((d) => d.id === acc.day_id);

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200">
                        {dayObj ? `Den ${dayObj.day_number}: Noc ${index + 1}` : `Noc ${index + 1}`}
                      </span>
                      {acc.location && (
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          {acc.location}
                        </span>
                      )}
                      {acc.booking_status === 'confirmed' && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Potvrzeno
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                      {acc.hotel_name}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Typ pokoje:{' '}
                      <span className="font-semibold">{acc.room_type || 'Dvoulůžkový pokoj'}</span>
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2">
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        ${price}{' '}
                        <span className="text-xs font-normal text-gray-500">
                          {acc.price_currency || 'USD'} / noc
                        </span>
                      </div>
                      {scenario === '2+1' && acc.price_single && (
                        <div className="text-[11px] text-gray-500">
                          2L: ${acc.price_total - acc.price_single} | Single: ${acc.price_single}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(acc)}
                        title="Upravit ubytování"
                        className="p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccommodation(acc.id, acc.hotel_name)}
                        title="Smazat ubytování"
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details Badges */}
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50 text-xs text-gray-600 dark:text-gray-300">
                  {acc.breakfast_included && (
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                      <Coffee className="w-3.5 h-3.5" />
                      <span>Snídaně v ceně</span>
                    </div>
                  )}

                  {acc.cancellation_policy && (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>{acc.cancellation_policy}</span>
                    </div>
                  )}

                  {acc.booking_reference && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Rezervace: <strong>{acc.booking_reference}</strong></span>
                    </div>
                  )}

                  {acc.booking_url && (
                    <a
                      href={acc.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-bold"
                    >
                      <span>Booking.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Accommodation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 flex items-center justify-center">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingAcc ? 'Upravit ubytování' : 'Přidat nové ubytování'}
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

            <form onSubmit={handleSaveAccommodation} className="space-y-4 py-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Název hotelu / ubytování *
                </label>
                <input
                  type="text"
                  required
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  placeholder="Např. Habarana Village by Cinnamon..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Přiřadit ke Dni cesty
                  </label>
                  <select
                    value={dayId}
                    onChange={(e) => setDayId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Bez vazby na den --</option>
                    {days.map((d) => (
                      <option key={d.id} value={d.id}>
                        Den {d.day_number}: {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Město / Lokalita
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Např. Habarana, Ella, Kandy..."
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Zeměp. šířka (lat)
                  </label>
                  <input
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="např. 8.0336"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Zeměp. délka (lng)
                  </label>
                  <input
                    type="text"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="např. 80.7516"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Celková cena za noc ($ USD)
                  </label>
                  <input
                    type="number"
                    value={priceTotal}
                    onChange={(e) => setPriceTotal(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Cena Single pokoje ($ USD)
                  </label>
                  <input
                    type="number"
                    value={priceSingle}
                    onChange={(e) => setPriceSingle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Typ pokoje
                  </label>
                  <input
                    type="text"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    placeholder="Např. Deluxe Room, Bungalov..."
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Počet pokojů
                  </label>
                  <input
                    type="number"
                    value={roomsCount}
                    onChange={(e) => setRoomsCount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="breakfast"
                  checked={breakfastIncluded}
                  onChange={(e) => setBreakfastIncluded(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="breakfast" className="font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                  ☕ Snídaně v ceně pobytu
                </label>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Odkaz na Booking.com / Hotel
                </label>
                <input
                  type="url"
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                  placeholder="https://www.booking.com/hotel/..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Rezervační číslo / Kód
                  </label>
                  <input
                    type="text"
                    value={bookingReference}
                    onChange={(e) => setBookingReference(e.target.value)}
                    placeholder="Např. BK-HAB-2026"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Storno podmínky
                  </label>
                  <input
                    type="text"
                    value={cancellationPolicy}
                    onChange={(e) => setCancellationPolicy(e.target.value)}
                    placeholder="Např. Zdarma do 22. 12."
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-750 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Poznámky
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Poznámky k ubytování, transferu, platbě na místě..."
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
                  <span>{editingAcc ? 'Uložit změny' : 'Přidat ubytování'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
