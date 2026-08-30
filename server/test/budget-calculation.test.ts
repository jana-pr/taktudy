import { describe, it, expect } from 'vitest';
import { calculateTripBudget } from '../../src/utils/budgetCalculator';
import { FullTrip } from '../../src/types';

describe('Budget Calculations Verification', () => {
  it('Calculates budget correctly for 2 travelers on a 4-day trip', () => {
    const mockTrip: FullTrip = {
      id: 'trip_praha_2026',
      owner_id: 'user_1',
      title: 'Víkend v Praze',
      status: 'planning',
      travelers_count: 2,
      budget_currency: 'CZK',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      stages: [],
      days: [
        { id: 'd1', trip_id: 'trip_praha_2026', day_number: 1, title: 'Den 1', has_detail: false, version: 1 },
        { id: 'd2', trip_id: 'trip_praha_2026', day_number: 2, title: 'Den 2', has_detail: false, version: 1 },
        { id: 'd3', trip_id: 'trip_praha_2026', day_number: 3, title: 'Den 3', has_detail: false, version: 1 },
        { id: 'd4', trip_id: 'trip_praha_2026', day_number: 4, title: 'Den 4', has_detail: false, version: 1 },
      ],
      subRoutes: [],
      pois: [
        {
          id: 'poi_1',
          trip_id: 'trip_praha_2026',
          category_id: 'monument',
          name: 'Pražský hrad',
          is_top: true,
          lat: 50.09,
          lng: 14.40,
          time_mode: 'none',
          visit_status: 'unvisited',
          is_mandatory: true,
          is_enabled: true,
          cost_est: 250, // 250 CZK na osobu
          cost_category: 'tickets',
          sort_order: 1,
          version: 1,
        },
        {
          id: 'poi_2',
          trip_id: 'trip_praha_2026',
          category_id: 'museum',
          name: 'Národní muzeum',
          is_top: false,
          lat: 50.08,
          lng: 14.43,
          time_mode: 'none',
          visit_status: 'unvisited',
          is_mandatory: false,
          is_enabled: true,
          cost_est: 200, // 200 CZK na osobu
          cost_category: 'tickets',
          sort_order: 2,
          version: 1,
        },
      ],
      accommodations: [
        {
          id: 'acc_1',
          trip_id: 'trip_praha_2026',
          hotel_name: 'Hotel Praha',
          price_total: 6000, // 6000 CZK celkem za pokoj pro 2
          price_currency: 'CZK',
          rooms_count: 1,
          breakfast_included: true,
          booking_status: 'confirmed',
        },
      ],
      bookings: [
        {
          id: 'bkg_1',
          trip_id: 'trip_praha_2026',
          type: 'train',
          title: 'Vlak Brno - Praha a zpět',
          price: 1200, // 1200 CZK celkem
          currency: 'CZK',
          status: 'confirmed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };

    const budget = calculateTripBudget(mockTrip);

    // Accommodations: 6000 celkem -> 3000 / osoba
    expect(budget.totalHotelCost).toBe(6000);
    expect(budget.hotelAveragePerPerson).toBe(3000);

    // Bookings (vlak): 1200 celkem -> 600 / osoba
    expect(budget.totalTrainCost).toBe(1200);
    expect(budget.trainPerPerson).toBe(600);

    // POIs: Vstup 1 (250) + Vstup 2 (200) = 450 / osoba -> 900 celkem
    expect(budget.poisPerPerson).toBe(450);
    expect(budget.totalPoisCost).toBe(900);

    // Stravování: 4 dny * 25 = 100 / osoba -> 200 celkem
    expect(budget.foodPerPerson).toBe(100);
    expect(budget.totalFoodCost).toBe(200);

    // Drobné kapesné: 4 dny * 5 = 20 / osoba -> 40 celkem
    expect(budget.otherDailyPerPerson).toBe(20);
    expect(budget.totalOtherDailyCost).toBe(40);

    // Celkem = 6000 + 1200 + 900 + 200 + 40 = 8340
    expect(budget.grandTotal).toBe(8340);

    // Na osobu = 8340 / 2 = 4170
    expect(budget.averagePerPerson).toBe(4170);

    // Matematická konzistence: averagePerPerson * 2 === grandTotal
    expect(budget.averagePerPerson * 2).toBe(budget.grandTotal);
  });

  it('Calculates 3-person room scenario 2+1 with exact mathematical balance', () => {
    const mockTrip: FullTrip = {
      id: 'trip_demo_3p',
      owner_id: 'user_1',
      title: 'Tři cestovatelé',
      status: 'planning',
      travelers_count: 3,
      room_scenario: '2+1',
      budget_currency: 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      stages: [],
      days: [{ id: 'd1', trip_id: 'trip_demo_3p', day_number: 1, title: 'Den 1', has_detail: false, version: 1 }],
      subRoutes: [],
      pois: [],
      accommodations: [
        {
          id: 'acc_1',
          trip_id: 'trip_demo_3p',
          hotel_name: 'Hotel Resort',
          price_total: 300, // 2 pokoje celkem: dvoulůžkový 180, jednolůžkový 120
          price_single: 120,
          price_currency: 'USD',
          rooms_count: 2,
          breakfast_included: true,
          booking_status: 'confirmed',
        },
      ],
      bookings: [
        {
          id: 'b1',
          trip_id: 'trip_demo_3p',
          type: 'transport',
          title: 'Pronájem auta',
          price: 300, // 100 na osobu
          currency: 'USD',
          status: 'confirmed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };

    const budget = calculateTripBudget(mockTrip, '2+1');

    // Double room person: 180 / 2 = 90 za hotel + 100 doprava + 25 jídlo + 5 kapesné = 220
    expect(budget.hotelDoublePerPerson).toBe(90);

    // Single room person: 120 za hotel + 100 doprava + 25 jídlo + 5 kapesné = 250
    expect(budget.hotelSinglePerPerson).toBe(120);

    // Kontrola váženého součtu: 2 * double + 1 * single musí přesně rovnat se grandTotal!
    const weightedTotal = budget.perPersonTotalDouble * 2 + budget.perPersonTotalSingle;
    expect(weightedTotal).toBe(budget.grandTotal);
  });
});
