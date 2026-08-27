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
} from 'lucide-react';
import { tripsApi } from '../api/client';

interface AccommodationsViewProps {
  trip: FullTrip;
  onTripUpdated?: () => void;
}

export const AccommodationsView: React.FC<AccommodationsViewProps> = ({
  trip,
  onTripUpdated,
}) => {
  const accommodations = trip.accommodations || [];
  const [scenario, setScenario] = useState<'2+1' | 'triple'>(trip.room_scenario || '2+1');
  const [savingScenario, setSavingScenario] = useState(false);

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

  // Calculate totals based on room scenario
  // Scenario 2+1: 2 rooms (1 double + 1 single). price_total is for the 2 rooms.
  // Scenario triple: 1 triple room (typically ~70% of 2 rooms cost).
  const totalAccCost = accommodations.reduce((sum, acc) => {
    if (scenario === '2+1') {
      return sum + (acc.price_total || 0);
    } else {
      // Triple room price estimate (~75% of 2-room cost or customized)
      const triplePrice = Math.round((acc.price_total || 0) * 0.75);
      return sum + triplePrice;
    }
  }, 0);

  const perPersonCostDouble = Math.round(
    accommodations.reduce((sum, acc) => {
      // In 2+1: Double room price is price_total - price_single, split between 2 people
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
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header & Scenario Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Bed className="w-4 h-4" /> Ubytování a hotely
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Rozpis 15 noclehů
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Přepínejte mezi variantami pokojů pro 3 dospělé cestující
            </p>
          </div>

          {/* Room Scenario Toggle */}
          <div className="bg-gray-100 dark:bg-gray-700/60 p-1.5 rounded-2xl flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleScenarioChange('2+1')}
              disabled={savingScenario}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                scenario === '2+1'
                  ? 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Varianta A: Pokoj 2 + 1
            </button>
            <button
              onClick={() => handleScenarioChange('triple')}
              disabled={savingScenario}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                scenario === 'triple'
                  ? 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Varianta B: Pokoj pro 3
            </button>
          </div>
        </div>

        {/* Pricing Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="bg-teal-50/60 dark:bg-teal-950/20 p-4 rounded-2xl border border-teal-100 dark:border-teal-900/40">
            <div className="text-xs font-medium text-teal-700 dark:text-teal-300">
              Celkem za ubytování (15 nocí)
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
                  Vlastní samostatný pokoj na celých 15 nocí
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
        {accommodations.map((acc, index) => {
          const price =
            scenario === '2+1'
              ? acc.price_total
              : Math.round(acc.price_total * 0.75);

          return (
            <div
              key={acc.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200">
                      Noc {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {acc.location}
                    </span>
                    {acc.booking_status === 'confirmed' && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Potvrzeno
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {acc.hotel_name}
                  </h3>

                  {acc.room_type && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {scenario === '2+1' ? acc.room_type : 'Třílůžkový pokoj (Triple Room)'}
                    </p>
                  )}
                </div>

                {/* Price Pill */}
                <div className="sm:text-right shrink-0">
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    ${price} <span className="text-xs font-normal text-gray-500">USD / noc</span>
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    {scenario === '2+1' ? '2 pokoje (1× dbl + 1× sgl)' : '1× pokoj pro 3'}
                  </div>
                </div>
              </div>

              {/* Meta details: Breakfast, Cancellation, Booking link */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs">
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <Coffee className="w-3.5 h-3.5 text-teal-600" />
                  <span>{acc.breakfast_included ? 'Snídaně v ceně' : 'Bez snídaně'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span className="truncate">{acc.cancellation_policy || 'Storno dle hotelu'}</span>
                </div>

                <div className="flex items-center justify-start sm:justify-end gap-2">
                  {acc.booking_reference && (
                    <span className="text-gray-500 font-mono text-[11px]">
                      Ref: {acc.booking_reference}
                    </span>
                  )}
                  {acc.booking_url && (
                    <a
                      href={acc.booking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      Otevřít Booking <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {acc.notes && (
                <div className="mt-2.5 p-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <span>{acc.notes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
