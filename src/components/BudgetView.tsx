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
} from 'lucide-react';
import { tripsApi } from '../api/client';
import { calculateTripBudget } from '../utils/budgetCalculator';

interface BudgetViewProps {
  trip: FullTrip;
  onTripUpdated?: () => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({ trip, onTripUpdated }) => {
  const [scenario, setScenario] = useState<'2+1' | 'triple'>(trip.room_scenario || '2+1');
  const [saving, setSaving] = useState(false);

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

      {/* Breakdown Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Položkový rozpad rozpočtu
        </h3>

        <div className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
          {/* Flights (pokud jsou kalkulovány) */}
          {(budget.totalFlightCost > 0 || trip.id === 'trip_srilanka_2026') && (
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Letenky</div>
                  <div className="text-xs text-gray-500">
                    {budget.hasFlightBookings ? 'Dle potvrzených rezervací' : `Kalkulováno $${budget.flightPerPerson} / osoba`}
                  </div>
                </div>
              </div>
              <div className="text-right font-bold text-gray-900 dark:text-white">
                ${budget.totalFlightCost.toLocaleString()}{' '}
                <span className="text-xs font-normal text-gray-500">(${budget.flightPerPerson}/os.)</span>
              </div>
            </div>
          )}

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
          {(budget.totalTransportCost > 0 || trip.id === 'trip_srilanka_2026') && (
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {budget.transportServiceName || 'Doprava a transfery'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Auto, palivo, přesuny a přeprava
                  </div>
                </div>
              </div>
              <div className="text-right font-bold text-gray-900 dark:text-white">
                ${budget.totalTransportCost.toLocaleString()}{' '}
                <span className="text-xs font-normal text-gray-500">(${budget.transportPerPerson}/os.)</span>
              </div>
            </div>
          )}

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

          {/* Food */}
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
    </div>
  );
};
