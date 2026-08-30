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
} from 'lucide-react';
import { tripsApi } from '../api/client';

interface BudgetViewProps {
  trip: FullTrip;
  onTripUpdated?: () => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({ trip, onTripUpdated }) => {
  const [scenario, setScenario] = useState<'2+1' | 'triple'>(trip.room_scenario || '2+1');
  const [saving, setSaving] = useState(false);

  const travelersCount = trip.travelers_count || 3;
  const pois = trip.pois || [];
  const accommodations = trip.accommodations || [];
  const transportService = trip.transportServices?.[0] || {
    total_price: 855,
    service_name: 'Private car + English-speaking driver',
  };

  // Fixed estimate costs (per person)
  const flightPerPerson = 850; // Letenka
  const foodPerPerson = 400; // Jídlo a pití za 16 dní (~$25/den)
  const otherPerPerson = 120; // Víza ($50), spropitné pro řidiče ($50), SIM ($20)

  // Driver cost
  const totalDriverCost = transportService.total_price || 855;
  const driverPerPerson = Math.round(totalDriverCost / travelersCount);

  // Train cost (Day 9)
  const trainPoi = pois.find((p) => p.cost_category === 'train');
  const trainPerPerson = trainPoi?.cost_est || 8;
  const totalTrainCost = trainPerPerson * travelersCount;

  // Hotel costs based on scenario
  const totalHotelCost = accommodations.reduce((sum, acc) => {
    if (scenario === '2+1') {
      return sum + (acc.price_total || 0);
    } else {
      return sum + Math.round((acc.price_total || 0) * 0.75);
    }
  }, 0);

  const hotelDoublePerPerson = Math.round(
    accommodations.reduce((sum, acc) => {
      const doubleRoomPrice = (acc.price_total || 0) - (acc.price_single || 0);
      return sum + doubleRoomPrice / 2;
    }, 0)
  );

  const hotelSinglePerPerson = Math.round(
    accommodations.reduce((sum, acc) => {
      return sum + (acc.price_single || Math.round((acc.price_total || 0) * 0.45));
    }, 0)
  );

  const hotelTriplePerPerson = Math.round(totalHotelCost / travelersCount);

  // Mandatory entrance tickets
  const mandatoryPois = pois.filter((p) => p.is_mandatory && p.cost_category === 'tickets' && p.is_enabled);
  const ticketsPerPerson = mandatoryPois.reduce((sum, p) => sum + (p.cost_est || 0), 0);
  const totalTicketsCost = ticketsPerPerson * travelersCount;

  // Optional / toggleable activities
  const optionalActivities = pois.filter((p) => !p.is_mandatory && (p.cost_est || 0) > 0);

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

  // Calculate active optional activities total
  const activeOptionalPerPerson = optionalActivities
    .filter((p) => p.is_enabled)
    .reduce((sum, p) => sum + (p.cost_est || 0), 0);
  const totalActiveOptional = activeOptionalPerPerson * travelersCount;

  // Common costs per person (excluding hotels)
  const commonPerPerson =
    flightPerPerson +
    driverPerPerson +
    trainPerPerson +
    ticketsPerPerson +
    activeOptionalPerPerson +
    foodPerPerson +
    otherPerPerson;

  // Final totals per person
  const perPersonTotalDouble = commonPerPerson + hotelDoublePerPerson;
  const perPersonTotalSingle = commonPerPerson + hotelSinglePerPerson;
  const perPersonTotalTriple = commonPerPerson + hotelTriplePerPerson;

  // Total trip cost
  const grandTotal =
    scenario === '2+1'
      ? perPersonTotalDouble * 2 + perPersonTotalSingle
      : perPersonTotalTriple * 3;

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
              ${grandTotal.toLocaleString()} <span className="text-xl font-normal text-teal-200">USD</span>
            </h2>
            <p className="text-teal-200/90 text-xs sm:text-sm mt-1">
              Celkové náklady celé cesty pro {travelersCount} cestující na 16 dní / 15 nocí
            </p>
          </div>

          {/* Scenario selector */}
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
        </div>

        {/* Per-person Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/15">
          {scenario === '2+1' ? (
            <>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="text-xs text-teal-200 font-medium">
                  Cena / osoba (na dvoulůžkovém pokoji)
                </div>
                <div className="text-2xl sm:text-3xl font-bold mt-1">
                  ${perPersonTotalDouble.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-teal-200">USD / os.</span>
                </div>
                <div className="text-[11px] text-teal-300/80 mt-1">
                  Společný hotelový pokoj ($ {hotelDoublePerPerson}) + podíl na společných nákladech ($ {commonPerPerson})
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="text-xs text-teal-200 font-medium">
                  Cena / osoba (samostatný single pokoj)
                </div>
                <div className="text-2xl sm:text-3xl font-bold mt-1">
                  ${perPersonTotalSingle.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-teal-200">USD / os.</span>
                </div>
                <div className="text-[11px] text-teal-300/80 mt-1">
                  Vlastní hotelový pokoj ($ {hotelSinglePerPerson}) + podíl na společných nákladech ($ {commonPerPerson})
                </div>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-teal-200 font-medium">
                Rovnoměrná cena pro každého ze 3 cestujících
              </div>
              <div className="text-2xl sm:text-3xl font-bold mt-1">
                ${perPersonTotalTriple.toLocaleString()}{' '}
                <span className="text-sm font-normal text-teal-200">USD / osoba</span>
              </div>
              <div className="text-[11px] text-teal-300/80 mt-1">
                Ubytování ve 3-lůžkovém pokoji ($ {hotelTriplePerPerson}) + společné náklady ($ {commonPerPerson})
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
          {/* Flights */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                <Plane className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Letenka (Praha ↔ Colombo)</div>
                <div className="text-xs text-gray-500">Kalkulováno ${flightPerPerson} / osoba</div>
              </div>
            </div>
            <div className="text-right font-bold text-gray-900 dark:text-white">
              ${flightPerPerson * travelersCount}{' '}
              <span className="text-xs font-normal text-gray-500">(${flightPerPerson}/os.)</span>
            </div>
          </div>

          {/* Hotels */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                <Bed className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Ubytování a hotely (15 nocí)</div>
                <div className="text-xs text-gray-500">
                  {scenario === '2+1' ? '2 pokoje (1 dbl + 1 sgl)' : '1 pokoj pro 3 osoby'}
                </div>
              </div>
            </div>
            <div className="text-right font-bold text-gray-900 dark:text-white">
              ${totalHotelCost}{' '}
              <span className="text-xs font-normal text-gray-500">
                ({scenario === '2+1' ? `$${hotelDoublePerPerson} dbl / $${hotelSinglePerPerson} sgl` : `$${hotelTriplePerPerson}/os.`})
              </span>
            </div>
          </div>

          {/* Private Driver */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Auto + anglicky mluvící řidič</div>
                <div className="text-xs text-gray-500">
                  Palivo, mýtné, ubytování/strava řidiče, transfery, převoz kufrů při vlaku
                </div>
              </div>
            </div>
            <div className="text-right font-bold text-gray-900 dark:text-white">
              ${totalDriverCost}{' '}
              <span className="text-xs font-normal text-gray-500">(${driverPerPerson}/os.)</span>
            </div>
          </div>

          {/* Entrance Tickets */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Povinné vstupy & památky</div>
                <div className="text-xs text-gray-500">
                  Sigiriya ($36), Polonnaruwa ($30), Dambulla ($10), Chrám zubu ($15), Horton Plains ($35), Botanická ($12)
                </div>
              </div>
            </div>
            <div className="text-right font-bold text-gray-900 dark:text-white">
              ${totalTicketsCost}{' '}
              <span className="text-xs font-normal text-gray-500">(${ticketsPerPerson}/os.)</span>
            </div>
          </div>

          {/* Train */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                <Train className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Scénický horský vlak (Nanu Oya → Ella)</div>
                <div className="text-xs text-gray-500">Rezervovaná místa 2. třídy</div>
              </div>
            </div>
            <div className="text-right font-bold text-gray-900 dark:text-white">
              ${totalTrainCost}{' '}
              <span className="text-xs font-normal text-gray-500">(${trainPerPerson}/os.)</span>
            </div>
          </div>

          {/* Food */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Stravování, obědy a večeře</div>
                <div className="text-xs text-gray-500">Odhady ~$25 / den / osoba (snídaně v hotelech v ceně)</div>
              </div>
            </div>
            <div className="text-right font-bold text-gray-900 dark:text-white">
              ${foodPerPerson * travelersCount}{' '}
              <span className="text-xs font-normal text-gray-500">(${foodPerPerson}/os.)</span>
            </div>
          </div>
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
