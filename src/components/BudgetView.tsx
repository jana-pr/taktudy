import React, { useState } from 'react';
import { FullTrip, POI } from '../types';
import {
  DollarSign,
  Users,
  Plane,
  Car,
  Bed,
  Ticket,
  Compass,
  Train,
  Utensils,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Info,
  ShieldCheck,
  Edit2,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { tripsApi, bookingsApi } from '../api/client';
import { calculateTripBudget } from '../utils/budgetCalculator';

interface BudgetViewProps {
  trip: FullTrip;
  onTripUpdated?: () => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({ trip, onTripUpdated }) => {
  const [scenario, setScenario] = useState<'2+1' | 'triple'>(trip.room_scenario || '2+1');
  const [saving, setSaving] = useState(false);

  // Quick edit modals for Flights and Transport
  const [editingFlightModal, setEditingFlightModal] = useState(false);
  const [flightPriceInput, setFlightPriceInput] = useState('');
  const [flightProviderInput, setFlightProviderInput] = useState('');

  const [editingTransportModal, setEditingTransportModal] = useState(false);
  const [transportPriceInput, setTransportPriceInput] = useState('');
  const [transportTitleInput, setTransportTitleInput] = useState('');

  const budget = calculateTripBudget(trip, scenario);
  const { travelersCount, daysCount, nightsCount, currency } = budget;

  const optionalActivities = (trip.pois || []).filter((p) => !p.is_mandatory && (Number(p.cost_est) || 0) > 0);

  const handleToggleOptionalPoi = async (poi: POI) => {
    try {
      setSaving(true);
      await tripsApi.togglePoiEnabled(trip.id, poi.id, !poi.is_enabled);
      if (onTripUpdated) onTripUpdated();
    } catch (err) {
      console.error('Chyba při přepnutí volitelné aktivity:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleScenarioSwitch = async (newScenario: '2+1' | 'triple') => {
    setScenario(newScenario);
    try {
      setSaving(true);
      await tripsApi.setRoomScenario(trip.id, newScenario);
      if (onTripUpdated) onTripUpdated();
    } catch (err) {
      console.error('Chyba při změně scénáře pokojů:', err);
    } finally {
      setSaving(false);
    }
  };

  const openFlightEdit = () => {
    const existingFlight = (trip.bookings || []).find(
      (b) => (b.type === 'flight' || (b as any).type?.includes('let')) && b.status !== 'cancelled'
    );
    setFlightPriceInput(
      existingFlight?.price !== undefined
        ? String(existingFlight.price)
        : budget.totalFlightCost > 0
        ? String(budget.totalFlightCost)
        : ''
    );
    setFlightProviderInput(existingFlight?.provider || '');
    setEditingFlightModal(true);
  };

  const handleSaveFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(flightPriceInput);
    if (isNaN(priceNum) || priceNum < 0) return;

    setSaving(true);
    try {
      const existingFlight = (trip.bookings || []).find(
        (b) => (b.type === 'flight' || (b as any).type?.includes('let')) && b.status !== 'cancelled'
      );
      if (existingFlight) {
        await bookingsApi.update(trip.id, existingFlight.id, {
          price: priceNum,
          provider: flightProviderInput.trim() || undefined,
        });
      } else {
        await bookingsApi.create(trip.id, {
          type: 'flight',
          title: 'Letenky',
          price: priceNum,
          provider: flightProviderInput.trim() || undefined,
          currency: currency || 'USD',
        });
      }
      setEditingFlightModal(false);
      if (onTripUpdated) onTripUpdated();
    } catch (err) {
      console.error('Chyba při ukládání letenek:', err);
    } finally {
      setSaving(false);
    }
  };

  const openTransportEdit = () => {
    const existingTransport = (trip.bookings || []).find(
      (b) =>
        (b.type === 'transport' ||
          b.type === 'car' ||
          (b as any).type === 'auto' ||
          (b as any).type === 'transfer' ||
          (b as any).type?.includes('doprav')) &&
        b.status !== 'cancelled'
    );
    setTransportPriceInput(
      existingTransport?.price !== undefined
        ? String(existingTransport.price)
        : budget.totalTransportCost > 0
        ? String(budget.totalTransportCost)
        : ''
    );
    setTransportTitleInput(
      existingTransport?.title || budget.transportServiceName || 'Soukromé auto s řidičem'
    );
    setEditingTransportModal(true);
  };

  const handleSaveTransport = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(transportPriceInput);
    if (isNaN(priceNum) || priceNum < 0) return;

    setSaving(true);
    try {
      const existingTransport = (trip.bookings || []).find(
        (b) =>
          (b.type === 'transport' ||
            b.type === 'car' ||
            (b as any).type === 'auto' ||
            (b as any).type === 'transfer' ||
            (b as any).type?.includes('doprav')) &&
          b.status !== 'cancelled'
      );
      const title = transportTitleInput.trim() || 'Doprava a transfery';
      if (existingTransport) {
        await bookingsApi.update(trip.id, existingTransport.id, {
          title,
          price: priceNum,
        });
      } else {
        await bookingsApi.create(trip.id, {
          type: 'transport',
          title,
          price: priceNum,
          currency: currency || 'USD',
        });
      }
      setEditingTransportModal(false);
      if (onTripUpdated) onTripUpdated();
    } catch (err) {
      console.error('Chyba při ukládání dopravy:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-5xl mx-auto w-full max-w-full overflow-x-hidden">
      {/* Grand Total Hero Card */}
      <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-gray-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-200 text-xs font-bold uppercase tracking-wider">
              <DollarSign className="w-4 h-4" /> Kompletní kalkulace rozpočtu
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
              ${budget.grandTotal.toLocaleString()} <span className="text-xl font-normal text-teal-200">{currency}</span>
            </h2>
            <p className="text-teal-200/90 text-xs sm:text-sm mt-1">
              Celkové náklady celé cesty pro {travelersCount} {travelersCount === 1 ? 'cestujícího' : travelersCount < 5 ? 'cestující' : 'cestujících'} na {daysCount} {daysCount === 1 ? 'den' : daysCount < 5 ? 'dny' : 'dní'} / {nightsCount} {nightsCount === 1 ? 'noc' : nightsCount < 5 ? 'noci' : 'nocí'}
            </p>
          </div>

          {/* Scenario selector ONLY if 3 travelers */}
          {travelersCount === 3 && (
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl flex items-center gap-1 border border-white/15">
              <button
                onClick={() => handleScenarioSwitch('2+1')}
                disabled={saving}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  scenario === '2+1' ? 'bg-white text-teal-900 shadow-md' : 'text-white/80 hover:text-white'
                }`}
              >
                Pokoj 2 + 1
              </button>
              <button
                onClick={() => handleScenarioSwitch('triple')}
                disabled={saving}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  scenario === 'triple' ? 'bg-white text-teal-900 shadow-md' : 'text-white/80 hover:text-white'
                }`}
              >
                Pokoj pro 3
              </button>
            </div>
          )}
        </div>

        {/* Per-person Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/15">
          {travelersCount === 3 && scenario === '2+1' ? (
            <>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="text-xs text-teal-200 font-medium">
                  Cena / osoba (na dvoulůžkovém pokoji)
                </div>
                <div className="text-2xl sm:text-3xl font-bold mt-1">
                  ${budget.perPersonTotalDouble.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-teal-200">{currency} / os.</span>
                </div>
                <div className="text-[11px] text-teal-300/80 mt-1">
                  Společný hotelový pokoj (${budget.hotelDoublePerPerson}) + podíl na společných nákladech (${budget.commonPerPerson})
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="text-xs text-teal-200 font-medium">
                  Cena / osoba (samostatný single pokoj)
                </div>
                <div className="text-2xl sm:text-3xl font-bold mt-1">
                  ${budget.perPersonTotalSingle.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-teal-200">{currency} / os.</span>
                </div>
                <div className="text-[11px] text-teal-300/80 mt-1">
                  Vlastní hotelový pokoj (${budget.hotelSinglePerPerson}) + podíl na společných nákladech (${budget.commonPerPerson})
                </div>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-teal-200 font-medium">
                Průměrná cena pro každého cestujícího
              </div>
              <div className="text-2xl sm:text-3xl font-bold mt-1">
                ${budget.averagePerPerson.toLocaleString()}{' '}
                <span className="text-sm font-normal text-teal-200">{currency} / osoba</span>
              </div>
              <div className="text-[11px] text-teal-300/80 mt-1">
                Ubytování (${budget.hotelAveragePerPerson}) + podíl na společných nákladech (${budget.commonPerPerson})
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3 Pillars Summary: Ubytování + Cesta + Náklady */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-teal-100 dark:border-teal-900/50 shadow-xs">
          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Bed className="w-4 h-4" />
            <span>1. Ubytování</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            ${budget.totalHotelCost.toLocaleString()} <span className="text-xs font-normal text-gray-500">{currency}</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            ${budget.hotelAveragePerPerson.toLocaleString()} {currency} / os. ({nightsCount} nocí)
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/50 shadow-xs">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Plane className="w-4 h-4" />
            <span>2. Cesta a doprava</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            ${budget.totalTravelCost.toLocaleString()} <span className="text-xs font-normal text-gray-500">{currency}</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            ${budget.travelPerPerson.toLocaleString()} {currency} / os. (letenky + transfery)
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-purple-100 dark:border-purple-900/50 shadow-xs">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider">
            <Ticket className="w-4 h-4" />
            <span>3. Náklady & Vstupy</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            ${budget.totalActivitiesCost.toLocaleString()} <span className="text-xs font-normal text-gray-500">{currency}</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            ${budget.activitiesPerPerson.toLocaleString()} {currency} / os. (vstupy a zážitky)
          </div>
        </div>
      </div>

      {/* Breakdown Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Položkový rozpad rozpočtu
        </h3>

        <div className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
          {/* Flights */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Plane className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Letenky</span>
                  <button
                    type="button"
                    onClick={openFlightEdit}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5 hover:underline"
                    title="Upravit nebo zadat cenu letenek"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{budget.totalFlightCost > 0 ? 'Upravit' : 'Zadat'}</span>
                  </button>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {budget.totalFlightCost > 0
                    ? budget.hasFlightBookings
                      ? 'Dle zadaných letenek v rezervacích'
                      : `Kalkulováno $${budget.flightPerPerson} / osoba`
                    : 'Dosud nezadána cena letenek'}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              {budget.totalFlightCost > 0 ? (
                <div className="font-bold text-gray-900 dark:text-white">
                  ${budget.totalFlightCost.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-gray-500">(${budget.flightPerPerson}/os.)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openFlightEdit}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800"
                >
                  + Zadat letenky
                </button>
              )}
            </div>
          </div>

          {/* Hotels */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                <Bed className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Ubytování a hotely ({nightsCount} nocí)</div>
                <div className="text-xs text-gray-500">
                  {travelersCount === 3 && scenario === '2+1' ? '2 pokoje (1 dbl + 1 sgl)' : `${travelersCount} cestující`}
                </div>
              </div>
            </div>
            <div className="text-right font-bold text-gray-900 dark:text-white">
              ${budget.totalHotelCost.toLocaleString()}{' '}
              <span className="text-xs font-normal text-gray-500">
                ({travelersCount === 3 && scenario === '2+1'
                  ? `$${budget.hotelDoublePerPerson} dbl / $${budget.hotelSinglePerPerson} sgl`
                  : `$${budget.hotelAveragePerPerson}/os.`})
              </span>
            </div>
          </div>

          {/* Transport / Driver */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="truncate">{budget.transportServiceName || 'Doprava a transfery'}</span>
                  <button
                    type="button"
                    onClick={openTransportEdit}
                    className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-0.5 hover:underline shrink-0"
                    title="Upravit nebo zadat cenu dopravy"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{budget.totalTransportCost > 0 ? 'Upravit' : 'Zadat'}</span>
                  </button>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {budget.totalTransportCost > 0
                    ? 'Auto, palivo, transfery a přesuny'
                    : 'Dosud nezadána cena dopravy'}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              {budget.totalTransportCost > 0 ? (
                <div className="font-bold text-gray-900 dark:text-white">
                  ${budget.totalTransportCost.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-gray-500">(${budget.transportPerPerson}/os.)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openTransportEdit}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors border border-amber-200 dark:border-amber-800"
                >
                  + Zadat dopravu
                </button>
              )}
            </div>
          </div>

          {/* Entrance Tickets */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Povinné vstupy & památky z itineráře</div>
                <div className="text-xs text-gray-500">
                  {budget.mandatoryTicketsPerPerson > 0 ? 'Vstupy s povinnou návštěvou' : 'Zatím nezadány žádné vstupy'}
                </div>
              </div>
            </div>
            <div className="text-right font-bold text-gray-900 dark:text-white">
              ${budget.totalMandatoryTicketsCost.toLocaleString()}{' '}
              <span className="text-xs font-normal text-gray-500">(${budget.mandatoryTicketsPerPerson}/os.)</span>
            </div>
          </div>

          {/* Train */}
          {budget.totalTrainCost > 0 && (
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                  <Train className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Vlaky a scénické přejezdy</div>
                  <div className="text-xs text-gray-500">Jízdenky a místenky</div>
                </div>
              </div>
              <div className="text-right font-bold text-gray-900 dark:text-white">
                ${budget.totalTrainCost.toLocaleString()}{' '}
                <span className="text-xs font-normal text-gray-500">(${budget.trainPerPerson}/os.)</span>
              </div>
            </div>
          )}

          {/* Visas & Insurance */}
          {budget.totalVisaInsuranceCost > 0 && (
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Víza a cestovní pojištění</div>
                  <div className="text-xs text-gray-500">Vstupní formality a pojistky</div>
                </div>
              </div>
              <div className="text-right font-bold text-gray-900 dark:text-white">
                ${budget.totalVisaInsuranceCost.toLocaleString()}{' '}
                <span className="text-xs font-normal text-gray-500">(${budget.visaInsurancePerPerson}/os.)</span>
              </div>
            </div>
          )}

          {/* Food (pouze pokud je zadáno v rozpočtu) */}
          {budget.totalFoodCost > 0 && (
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Stravování, obědy a večeře ({daysCount} dní)</div>
                  <div className="text-xs text-gray-500">Odhady ~$25 / den / osoba (snídaně v ubytování)</div>
                </div>
              </div>
              <div className="text-right font-bold text-gray-900 dark:text-white">
                ${budget.totalFoodCost.toLocaleString()}{' '}
                <span className="text-xs font-normal text-gray-500">(${budget.foodPerPerson}/os.)</span>
              </div>
            </div>
          )}

          {/* Pocket money / SIM / tips */}
          {budget.totalOtherDailyCost > 0 && (
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Drobné výdaje, spropitné a místní SIM</div>
                  <div className="text-xs text-gray-500">Doporučená rezerva v hotovosti</div>
                </div>
              </div>
              <div className="text-right font-bold text-gray-900 dark:text-white">
                ${budget.totalOtherDailyCost.toLocaleString()}{' '}
                <span className="text-xs font-normal text-gray-500">(${budget.otherDailyPerPerson}/os.)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Volitelné aktivity – Interaktivní přepínače (Section 12) */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Volitelné zážitky a safari
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Zapnutím nebo vypnutím se rozpočet cesty okamžitě přepočítá
            </p>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          {optionalActivities.map((act) => (
            <div
              key={act.id}
              onClick={() => handleToggleOptionalPoi(act)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                act.is_enabled
                  ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/50'
                  : 'bg-gray-50/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {act.name}
                  </span>
                  {act.is_enabled ? (
                    <span className="text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 px-2 py-0.5 rounded-full font-bold">
                      V ROZPOČTU
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-bold">
                      VYPNUTO
                    </span>
                  )}
                </div>
                {act.why_visit && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {act.why_visit}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="font-bold text-base text-gray-900 dark:text-white">
                    ${(act.cost_est || 0) * travelersCount}{' '}
                    <span className="text-xs font-normal text-gray-500">USD</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    ${act.cost_est || 0} / osoba
                  </div>
                </div>

                <button
                  type="button"
                  className="text-teal-600 dark:text-teal-400 p-1"
                >
                  {act.is_enabled ? (
                    <ToggleRight className="w-7 h-7" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flight Edit Modal */}
      {editingFlightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-outdoor-dark-card rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                    Kalkulace letenek
                  </h3>
                  <p className="text-xs text-stone-500">
                    Pro {travelersCount} {travelersCount === 1 ? 'cestujícího' : 'cestující'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFlightModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFlight} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Celková cena letenek za celou skupinu ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">$</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={flightPriceInput}
                    onChange={(e) => setFlightPriceInput(e.target.value)}
                    placeholder="např. 2550"
                    className="w-full pl-8 pr-4 py-2.5 bg-stone-50 dark:bg-stone-900 text-sm font-bold rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  />
                </div>
                {flightPriceInput && !isNaN(parseFloat(flightPriceInput)) && (
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold pl-1">
                    ≈ ${Math.round(parseFloat(flightPriceInput) / travelersCount)} {currency} / osoba
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Letecká společnost / poznámka (volitelné)
                </label>
                <input
                  type="text"
                  value={flightProviderInput}
                  onChange={(e) => setFlightProviderInput(e.target.value)}
                  placeholder="např. Emirates, FlyDubai, Qatar Airways..."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 text-xs rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFlightModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Uložit do rozpočtu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transport Edit Modal */}
      {editingTransportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-outdoor-dark-card rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-700 p-6 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                    Kalkulace dopravy a transferů
                  </h3>
                  <p className="text-xs text-stone-500">
                    Pro {travelersCount} {travelersCount === 1 ? 'cestujícího' : 'cestující'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTransportModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransport} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Název dopravy / služby
                </label>
                <input
                  type="text"
                  required
                  value={transportTitleInput}
                  onChange={(e) => setTransportTitleInput(e.target.value)}
                  placeholder="např. Soukromé auto s řidičem, Pronájem auta..."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 text-xs rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Celková cena dopravy za celou skupinu ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">$</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={transportPriceInput}
                    onChange={(e) => setTransportPriceInput(e.target.value)}
                    placeholder="např. 855"
                    className="w-full pl-8 pr-4 py-2.5 bg-stone-50 dark:bg-stone-900 text-sm font-bold rounded-xl border border-stone-200 dark:border-stone-700 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                </div>
                {transportPriceInput && !isNaN(parseFloat(transportPriceInput)) && (
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold pl-1">
                    ≈ ${Math.round(parseFloat(transportPriceInput) / travelersCount)} {currency} / osoba
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTransportModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Uložit do rozpočtu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
