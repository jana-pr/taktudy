import React from 'react';
import { FullTrip } from '../types';
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
} from 'lucide-react';

interface BookingsViewProps {
  trip: FullTrip;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ trip }) => {
  const accommodations = trip.accommodations || [];
  const transport = trip.transportServices?.[0];

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
          <FileText className="w-4 h-4" /> Vouchery, jízdenky a smlouvy
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
          Přehled všech rezervací cesty
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Všechna rezervační čísla, kontakty na řidiče a hotely na jednom místě pro bezproblémové cestování
        </p>
      </div>

      {/* Driver Service Contract Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-1">
                <Car className="w-3.5 h-3.5" /> DOPRAVNÍ SLUŽBA
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Potvrzeno
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              Soukromé auto s anglicky mluvícím řidičem (15 dní)
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Poskytovatel: <span className="font-semibold">{transport?.provider || 'Lanka Travel Drivers Co.'}</span>
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${transport?.total_price || 855}{' '}
              <span className="text-xs font-normal text-gray-500">USD celkem</span>
            </div>
            <div className="text-xs text-gray-500">
              ${Math.round((transport?.total_price || 855) / 3)} / osoba
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <div className="font-semibold">Rozsah sjednané služby:</div>
          <p>
            {transport?.includes_description ||
              'Zahrnuje: auto, řidiče, palivo, mýtné, parkovné, ubytování i stravu řidiče, letištní transfery a převoz zavazadel při cestě vlakem.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Phone className="w-4 h-4 text-teal-600" />
            <span>Asistenční linka řidiče: <strong>+94 77 123 4567</strong></span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Mail className="w-4 h-4 text-teal-600" />
            <span>E-mail: <strong>driver@lankatravel.lk</strong></span>
          </div>
        </div>
      </div>

      {/* Scenic Train Tickets Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-1">
                <Train className="w-3.5 h-3.5" /> VLAKOVÁ JÍZDENKA
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Rezervováno
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              Vyhlídkový vlak Nanu Oya → Ella (Main Line)
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Termín: <strong>3. ledna 2027</strong> | Odjezd cca <strong>12:45</strong> | Místa: <strong>2. třída reserved</strong>
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              $24 <span className="text-xs font-normal text-gray-500">USD</span>
            </div>
            <div className="text-xs text-gray-500">$8 / osoba</div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Poznámka: Fyzické jízdenky vyzvedne řidič na nádraží v Nanu Oya 30 minut před odjezdem na základě elektronického potvrzení č. <strong>SLR-883921</strong>.
        </p>
      </div>

      {/* Hotel Bookings List */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Hotelové rezervace (15 noclehů)
        </h3>

        <div className="space-y-3">
          {accommodations.map((acc, idx) => (
            <div
              key={acc.id}
              className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-teal-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                    Noc {idx + 1}
                  </span>
                  <span className="text-xs text-gray-400">• {acc.location}</span>
                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                    {acc.booking_reference || `BK-2026-${idx + 1}`}
                  </span>
                </div>
                <div className="font-bold text-sm text-gray-900 dark:text-white">
                  {acc.hotel_name}
                </div>
                <div className="text-xs text-gray-500">
                  {acc.room_type} | {acc.breakfast_included ? 'Snídaně v ceně' : 'Bez snídaně'}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="text-right">
                  <div className="font-bold text-sm text-gray-900 dark:text-white">
                    ${acc.price_total} <span className="text-xs font-normal text-gray-500">USD</span>
                  </div>
                  <div className="text-[11px] text-gray-500">{acc.cancellation_policy}</div>
                </div>

                {acc.booking_url && (
                  <a
                    href={acc.booking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Zobrazit na Booking.com"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
