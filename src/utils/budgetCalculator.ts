import { FullTrip, POI, Accommodation, Booking } from '../types';

export interface TripBudgetCalculation {
  travelersCount: number;
  daysCount: number;
  nightsCount: number;
  currency: string;
  scenario: '2+1' | 'triple';

  // Hotel costs
  totalHotelCost: number;
  hotelDoublePerPerson: number;
  hotelSinglePerPerson: number;
  hotelTriplePerPerson: number;
  hotelAveragePerPerson: number;

  // Bookings & Transport
  totalFlightCost: number;
  flightPerPerson: number;
  hasFlightBookings: boolean;

  totalTransportCost: number;
  transportPerPerson: number;
  transportServiceName: string;

  totalTrainCost: number;
  trainPerPerson: number;

  totalVisaInsuranceCost: number;
  visaInsurancePerPerson: number;

  totalOtherBookingsCost: number;

  // Tickets and activities (POIs)
  mandatoryTicketsPerPerson: number;
  totalMandatoryTicketsCost: number;

  activeOptionalPerPerson: number;
  totalActiveOptionalCost: number;

  totalPoisCost: number;
  poisPerPerson: number;

  // Daily allowances (Food & pocket money)
  foodPerPerson: number;
  totalFoodCost: number;

  otherDailyPerPerson: number;
  totalOtherDailyCost: number;

  // Common shared costs per person (excluding hotels)
  commonPerPerson: number;

  // Final totals per person
  perPersonTotalDouble: number;
  perPersonTotalSingle: number;
  perPersonTotalTriple: number;
  averagePerPerson: number;

  // Overall total
  grandTotal: number;
}

export function calculateTripBudget(
  trip: FullTrip,
  scenarioOverride?: '2+1' | 'triple'
): TripBudgetCalculation {
  const travelersCount = Math.max(1, trip.travelers_count || 1);
  const daysCount = Math.max(1, trip.days?.length || 1);
  const nightsCount = Math.max(1, daysCount > 1 ? daysCount - 1 : 1);
  const currency = trip.budget_currency || 'USD';
  const scenario: '2+1' | 'triple' = scenarioOverride || trip.room_scenario || (travelersCount === 3 ? '2+1' : 'triple');

  const accommodations = trip.accommodations || [];
  const bookings = trip.bookings || [];
  const pois = trip.pois || [];

  // 1. Hotels
  const baseHotelCost = accommodations.reduce((sum, a) => sum + (Number(a.price_total) || 0), 0);
  let totalHotelCost = baseHotelCost;

  if (travelersCount === 3 && scenario === 'triple') {
    totalHotelCost = accommodations.reduce(
      (sum, a) => sum + Math.round((Number(a.price_total) || 0) * 0.75),
      0
    );
  }

  const hotelDoublePerPerson =
    travelersCount === 3
      ? Math.round(
          accommodations.reduce((sum, a) => {
            const dbl = (Number(a.price_total) || 0) - (Number(a.price_single) || 0);
            return sum + Math.max(0, dbl) / 2;
          }, 0)
        )
      : Math.round(totalHotelCost / travelersCount);

  const hotelSinglePerPerson =
    travelersCount === 3
      ? Math.round(
          accommodations.reduce((sum, a) => {
            return sum + (Number(a.price_single) || Math.round((Number(a.price_total) || 0) * 0.45));
          }, 0)
        )
      : Math.round(totalHotelCost / travelersCount);

  const hotelTriplePerPerson = Math.round(totalHotelCost / travelersCount);
  const hotelAveragePerPerson = Math.round(totalHotelCost / travelersCount);

  // 2. Flights
  const flightBookings = bookings.filter((b) => b.type === 'flight' && b.status !== 'cancelled');
  const hasFlightBookings = flightBookings.length > 0;
  let totalFlightCost = flightBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  // Sri Lanka 2026 demo fallback if no flight booking exists
  if (totalFlightCost === 0 && trip.id === 'trip_srilanka_2026') {
    totalFlightCost = 850 * travelersCount;
  }
  const flightPerPerson = Math.round(totalFlightCost / travelersCount);

  // 3. Transport (Driver / car rental)
  const transportBookings = bookings.filter((b) => b.type === 'transport' && b.status !== 'cancelled');
  let totalTransportCost = transportBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
  let transportServiceName = transportBookings[0]?.title || '';

  if (totalTransportCost === 0 && trip.transportServices && trip.transportServices.length > 0) {
    totalTransportCost = trip.transportServices.reduce((sum, s) => sum + (Number(s.total_price) || 0), 0);
    transportServiceName = trip.transportServices[0]?.service_name || '';
  }

  if (totalTransportCost === 0 && trip.id === 'trip_srilanka_2026') {
    totalTransportCost = 855;
    transportServiceName = 'Soukromé auto s řidičem';
  }
  const transportPerPerson = Math.round(totalTransportCost / travelersCount);

  // 4. Train
  const trainBookings = bookings.filter((b) => b.type === 'train' && b.status !== 'cancelled');
  let totalTrainCost = trainBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  const trainPoi = pois.find((p) => p.cost_category === 'train' && p.is_enabled !== false);
  if (totalTrainCost === 0 && trainPoi && (trainPoi.cost_est || 0) > 0) {
    totalTrainCost = (trainPoi.cost_est || 0) * travelersCount;
  }
  if (totalTrainCost === 0 && trip.id === 'trip_srilanka_2026') {
    totalTrainCost = 8 * travelersCount;
  }
  const trainPerPerson = Math.round(totalTrainCost / travelersCount);

  // 5. Visas & Insurance
  const visaBookings = bookings.filter(
    (b) => (b.type === 'visa' || b.type === 'insurance') && b.status !== 'cancelled'
  );
  let totalVisaInsuranceCost = visaBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
  if (totalVisaInsuranceCost === 0 && trip.id === 'trip_srilanka_2026') {
    totalVisaInsuranceCost = 50 * travelersCount; // ETA visa
  }
  const visaInsurancePerPerson = Math.round(totalVisaInsuranceCost / travelersCount);

  // 6. Other bookings
  const otherBookings = bookings.filter(
    (b) =>
      !['flight', 'transport', 'train', 'visa', 'insurance', 'accommodation'].includes(b.type) &&
      b.status !== 'cancelled'
  );
  const totalOtherBookingsCost = otherBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  // 7. POI tickets & activities
  const mandatoryPois = pois.filter((p) => p.is_mandatory && p.cost_category === 'tickets' && p.is_enabled !== false);
  const mandatoryTicketsPerPerson = mandatoryPois.reduce((sum, p) => sum + (Number(p.cost_est) || 0), 0);
  const totalMandatoryTicketsCost = mandatoryTicketsPerPerson * travelersCount;

  const optionalActivities = pois.filter((p) => !p.is_mandatory && (Number(p.cost_est) || 0) > 0);
  const activeOptionalPerPerson = optionalActivities
    .filter((p) => p.is_enabled !== false)
    .reduce((sum, p) => sum + (Number(p.cost_est) || 0), 0);
  const totalActiveOptionalCost = activeOptionalPerPerson * travelersCount;

  const totalPoisCost = totalMandatoryTicketsCost + totalActiveOptionalCost;
  const poisPerPerson = mandatoryTicketsPerPerson + activeOptionalPerPerson;

  // 8. Food & pocket money estimates
  let foodPerPerson = Math.round(daysCount * 25);
  let otherDailyPerPerson = Math.round(daysCount * 5);

  if (trip.id === 'trip_srilanka_2026') {
    foodPerPerson = 400; // 16 dni
    otherDailyPerPerson = 70; // spropitne + SIM
  }
  const totalFoodCost = foodPerPerson * travelersCount;
  const totalOtherDailyCost = otherDailyPerPerson * travelersCount;

  // Common costs per person (all shared expenses except hotel accommodation)
  const commonPerPerson =
    flightPerPerson +
    transportPerPerson +
    trainPerPerson +
    visaInsurancePerPerson +
    Math.round(totalOtherBookingsCost / travelersCount) +
    mandatoryTicketsPerPerson +
    activeOptionalPerPerson +
    foodPerPerson +
    otherDailyPerPerson;

  // Final totals per person
  const perPersonTotalDouble = commonPerPerson + hotelDoublePerPerson;
  const perPersonTotalSingle = commonPerPerson + hotelSinglePerPerson;
  const perPersonTotalTriple = commonPerPerson + hotelTriplePerPerson;

  // Grand total
  const grandTotal =
    travelersCount === 3
      ? scenario === '2+1'
        ? perPersonTotalDouble * 2 + perPersonTotalSingle
        : perPersonTotalTriple * 3
      : commonPerPerson * travelersCount + totalHotelCost;

  const averagePerPerson = Math.round(grandTotal / travelersCount);

  return {
    travelersCount,
    daysCount,
    nightsCount,
    currency,
    scenario,
    totalHotelCost,
    hotelDoublePerPerson,
    hotelSinglePerPerson,
    hotelTriplePerPerson,
    hotelAveragePerPerson,
    totalFlightCost,
    flightPerPerson,
    hasFlightBookings,
    totalTransportCost,
    transportPerPerson,
    transportServiceName,
    totalTrainCost,
    trainPerPerson,
    totalVisaInsuranceCost,
    visaInsurancePerPerson,
    totalOtherBookingsCost,
    mandatoryTicketsPerPerson,
    totalMandatoryTicketsCost,
    activeOptionalPerPerson,
    totalActiveOptionalCost,
    totalPoisCost,
    poisPerPerson,
    foodPerPerson,
    totalFoodCost,
    otherDailyPerPerson,
    totalOtherDailyCost,
    commonPerPerson,
    perPersonTotalDouble,
    perPersonTotalSingle,
    perPersonTotalTriple,
    averagePerPerson,
    grandTotal,
  };
}
