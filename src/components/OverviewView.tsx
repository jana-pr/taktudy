import React from 'react';
import { FullTrip, Day, POI } from '../types';
import {
  Calendar,
  Users,
  Car,
  Moon,
  MapPin,
  ExternalLink,
  Navigation,
  Compass,
  ArrowRight,
  Sparkles,
  Bed,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface OverviewViewProps {
  trip: FullTrip;
  onSelectDay: (dayId: string) => void;
  onNavigateToPoi: (poi: POI) => void;
  onOpenQuickAdd?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  trip,
  onSelectDay,
  onNavigateToPoi,
}) => {
  const days = trip.days || [];
  const pois = trip.pois || [];
  const accommodations = trip.accommodations || [];

  const nightsCount = Math.max(0, days.length > 1 ? days.length - 1 : 1);
  const travelersCount = trip.travelers_count || 3;
  const primaryTransport = trip.primary_transport || 'Soukromé auto s řidičem';

  // Helper to open Google Maps day route with waypoint splitting
  const openGoogleMapsDayRoute = (dayPois: POI[], startLoc?: string | null, endLoc?: string | null) => {
    if (dayPois.length === 0 && !startLoc) return;

    const origin = startLoc ? encodeURIComponent(startLoc) : `${dayPois[0]?.lat},${dayPois[0]?.lng}`;
    const destination = endLoc
      ? encodeURIComponent(endLoc)
      : `${dayPois[dayPois.length - 1]?.lat},${dayPois[dayPois.length - 1]?.lng}`;

    const waypoints = dayPois
      .slice(startLoc ? 0 : 1, endLoc ? dayPois.length : dayPois.length - 1)
      .map((p) => `${p.lat},${p.lng}`)
      .join('|');

    const url = waypoints
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Hero Summary Card */}
      <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-teal-700/80 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-teal-100 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            {trip.country_region || 'Srí Lanka'}
          </span>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-medium">
            {trip.status === 'planning' ? 'Připravujeme' : 'Aktivní cesta'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-2">
          {trip.title}
        </h1>
        {trip.motto && (
          <p className="text-teal-200/90 text-sm sm:text-base italic mb-6">
            „{trip.motto}“
          </p>
        )}

        {/* 4 Stats Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center gap-2 text-teal-200 text-xs font-medium mb-1">
              <Calendar className="w-4 h-4" /> Termín
            </div>
            <div className="font-semibold text-sm sm:text-base text-white">
              {trip.start_date
                ? `${new Date(trip.start_date).toLocaleDateString('cs-CZ')} – ${new Date(trip.end_date || '').toLocaleDateString('cs-CZ')}`
                : '26. 12. 2026 – 10. 1. 2027'}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center gap-2 text-teal-200 text-xs font-medium mb-1">
              <Users className="w-4 h-4" /> Cestující
            </div>
            <div className="font-semibold text-sm sm:text-base text-white">
              {travelersCount} dospělí
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center gap-2 text-teal-200 text-xs font-medium mb-1">
              <Moon className="w-4 h-4" /> Noci & Dny
            </div>
            <div className="font-semibold text-sm sm:text-base text-white">
              {nightsCount} nocí / {days.length} dní
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center gap-2 text-teal-200 text-xs font-medium mb-1">
              <Car className="w-4 h-4" /> Doprava
            </div>
            <div className="font-semibold text-xs sm:text-sm text-white truncate" title={primaryTransport}>
              {primaryTransport}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Section Title */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Program cesty den po dni
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Přehledná časová osa všech {days.length} dní s trasou, zastávkami a hotely
          </p>
        </div>
      </div>

      {/* Vertical Timeline of Day Cards */}
      <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 sm:before:left-6 before:w-0.5 before:bg-teal-200 dark:before:bg-teal-900/50">
        {days.map((day) => {
          const dayPois = pois.filter((p) => p.day_id === day.id);
          const dayHotel = accommodations.find((a) => a.day_id === day.id);

          return (
            <div key={day.id} className="relative pl-10 sm:pl-14">
              {/* Day Number Marker Pin */}
              <div className="absolute left-1 sm:left-3 top-5 -translate-x-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-600 dark:bg-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-md border-2 border-white dark:border-gray-900 z-10">
                {day.day_number}
              </div>

              {/* Day Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
                      <span>Den {day.day_number}</span>
                      {day.specific_date && (
                        <>
                          <span>•</span>
                          <span>{new Date(day.specific_date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}</span>
                        </>
                      )}
                      {day.transit_time_est && (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          ⏱ {day.transit_time_est}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                      {day.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openGoogleMapsDayRoute(dayPois, day.start_location, day.overnight_location)}
                      className="px-3 py-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Otevřít trasu v Google Maps"
                    >
                      <Navigation className="w-3.5 h-3.5 text-teal-600" />
                      <span className="hidden sm:inline">Google Maps</span>
                    </button>
                    <button
                      onClick={() => onSelectDay(day.id)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      Itinerář <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Transit Route Line: Start -> Destination */}
                {(day.start_location || day.overnight_location) && (
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300 my-2.5 py-1 px-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg w-fit">
                    <span className="text-teal-600 dark:text-teal-400 font-semibold">{day.start_location || 'Start'}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{day.overnight_location || 'Cíl'}</span>
                    {day.distance_km ? <span className="text-gray-400">({day.distance_km} km)</span> : null}
                  </div>
                )}

                {/* Parallel transit special badge for 3. 1. */}
                {day.day_number === 9 && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                      <span>🚆 Paralelní přesun:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg border border-blue-100 dark:border-blue-900">
                        <span className="font-medium text-blue-800 dark:text-blue-300">My (vlak):</span> Vyhlídkový vlak Nanu Oya → Ella
                      </div>
                      <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg border border-blue-100 dark:border-blue-900">
                        <span className="font-medium text-blue-800 dark:text-blue-300">Řidič + kufry (auto):</span> Převeze hlavní zavazadla a čeká v Ella
                      </div>
                    </div>
                  </div>
                )}

                {/* POIs List in this day */}
                <div className="space-y-2 mt-3">
                  {dayPois.map((poi) => (
                    <div
                      key={poi.id}
                      onClick={() => onNavigateToPoi(poi)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        poi.is_mandatory
                          ? 'bg-white dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 hover:border-teal-400'
                          : 'bg-purple-50/40 dark:bg-purple-950/20 border-dashed border-purple-300 dark:border-purple-800/50 hover:border-purple-400'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Status Icon */}
                        {poi.is_mandatory ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 shrink-0">
                            POVINNÉ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 shrink-0">
                            VOLITELNÉ
                          </span>
                        )}

                        <div className="truncate">
                          <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
                            {poi.name}
                            {poi.is_top && <span className="text-amber-500 font-bold text-xs">★ TOP</span>}
                          </div>
                          {poi.why_visit && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {poi.why_visit}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {poi.data_origin === 'ai_completed' && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> AI
                          </span>
                        )}
                        {poi.cost_est ? (
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            ${poi.cost_est}
                          </span>
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}`,
                              '_blank'
                            );
                          }}
                          className="p-1 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                          title="Navigovat v Google Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hotel Card at the bottom of the day */}
                {dayHotel && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Bed className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {dayHotel.hotel_name}
                      </span>
                      <span className="text-gray-400">• {dayHotel.location}</span>
                    </div>

                    {dayHotel.booking_url && (
                      <a
                        href={dayHotel.booking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                      >
                        Booking.com <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
