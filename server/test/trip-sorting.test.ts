import { describe, it, expect } from 'vitest';
import { sortTrips, formatTripDateRange, getTripStatusInfo } from '../../src/utils/tripSort.js';
import { Trip } from '../../src/types/index.js';

describe('Trip Sorting and Formatting Utilities', () => {
  const dummyTrips: Trip[] = [
    {
      id: 'trip_1',
      owner_id: 'user_1',
      title: 'Toskánsko na podzim',
      status: 'planning',
      start_date: '2026-10-01',
      end_date: '2026-10-10',
      version: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'trip_2',
      owner_id: 'user_1',
      title: 'Srí Lanka 2024 (Stará cesta)',
      status: 'completed',
      start_date: '2024-12-25',
      end_date: '2025-01-08',
      version: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'trip_3',
      owner_id: 'user_1',
      title: 'Krkonoše víkend',
      status: 'ready',
      start_date: '2026-05-15',
      end_date: '2026-05-17',
      version: 1,
      created_at: '2026-02-01T00:00:00.000Z',
      updated_at: '2026-02-01T00:00:00.000Z',
    },
    {
      id: 'trip_4',
      owner_id: 'user_1',
      title: 'Nápad na Island',
      status: 'idea',
      start_date: null,
      end_date: null,
      version: 1,
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'trip_5',
      owner_id: 'user_1',
      title: 'Vídeň památky',
      status: 'completed',
      start_date: '2025-04-10',
      end_date: '2025-04-12',
      version: 1,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ];

  it('sortTrips: sorts upcoming/active trips chronologically by closest date and places completed at the bottom', () => {
    const sorted = sortTrips(dummyTrips);
    const sortedIds = sorted.map((t) => t.id);

    // 1. Closest upcoming trip: Krkonoše (2026-05-15)
    expect(sortedIds[0]).toBe('trip_3');

    // 2. Later upcoming trip: Toskánsko (2026-10-01)
    expect(sortedIds[1]).toBe('trip_1');

    // 3. Active/Idea trip without date: Island
    expect(sortedIds[2]).toBe('trip_4');

    // 4 & 5. Completed trips must be at the very bottom
    expect(['trip_2', 'trip_5']).toContain(sortedIds[3]);
    expect(['trip_2', 'trip_5']).toContain(sortedIds[4]);

    const lastTwo = sorted.slice(3);
    expect(lastTwo.every((t) => t.status === 'completed')).toBe(true);
  });

  it('formatTripDateRange: formats dates properly into Czech style', () => {
    expect(formatTripDateRange('2026-05-15', '2026-05-17')).toBe('15. – 17. 5. 2026');
    expect(formatTripDateRange('2026-05-28', '2026-06-05')).toBe('28. 5. – 5. 6. 2026');
    expect(formatTripDateRange('2026-12-25', '2027-01-05')).toBe('25. 12. 2026 – 5. 1. 2027');
    expect(formatTripDateRange('2026-05-15', null)).toBe('Od 15. 5. 2026');
    expect(formatTripDateRange(null, null)).toBe('Termín neurčen');
  });

  it('getTripStatusInfo: returns accurate status text and finishes flag', () => {
    const completedInfo = getTripStatusInfo('completed');
    expect(completedInfo.label).toBe('Dokončeno');
    expect(completedInfo.isFinished).toBe(true);

    const planningInfo = getTripStatusInfo('planning');
    expect(planningInfo.label).toBe('Připravujeme');
    expect(planningInfo.isFinished).toBe(false);

    const readyInfo = getTripStatusInfo('ready');
    expect(readyInfo.label).toBe('Připraveno k odjezdu');
    expect(readyInfo.isFinished).toBe(false);
  });
});
