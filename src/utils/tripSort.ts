import { Trip, TripStatus } from '../types';

export interface TripStatusInfo {
  label: string;
  badgeClass: string;
  dotClass: string;
  isFinished: boolean;
}

export function getTripStatusInfo(status: TripStatus): TripStatusInfo {
  switch (status) {
    case 'traveling':
    case 'active' as any:
      return {
        label: 'Právě probíhá',
        badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        dotClass: 'bg-emerald-500 animate-pulse',
        isFinished: false,
      };
    case 'ready':
      return {
        label: 'Připraveno k odjezdu',
        badgeClass: 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        dotClass: 'bg-teal-500',
        isFinished: false,
      };
    case 'planning':
      return {
        label: 'Připravujeme',
        badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dotClass: 'bg-amber-500',
        isFinished: false,
      };
    case 'idea':
      return {
        label: 'Nápad / Inspirace',
        badgeClass: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        dotClass: 'bg-sky-400',
        isFinished: false,
      };
    case 'completed':
      return {
        label: 'Dokončeno',
        badgeClass: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700',
        dotClass: 'bg-stone-400',
        isFinished: true,
      };
    case 'archived':
      return {
        label: 'Archivováno',
        badgeClass: 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700',
        dotClass: 'bg-stone-300',
        isFinished: true,
      };
    default:
      return {
        label: status || 'Neznámý stav',
        badgeClass: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200',
        dotClass: 'bg-stone-400',
        isFinished: false,
      };
  }
}

export function formatTripDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate && !endDate) {
    return 'Termín neurčen';
  }

  const parseDate = (dStr: string) => {
    // If format is YYYY-MM-DD
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return { day, month, year };
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
  };

  const s = startDate ? parseDate(startDate) : null;
  const e = endDate ? parseDate(endDate) : null;

  if (s && e) {
    if (s.year === e.year && s.month === e.month) {
      return `${s.day}. – ${e.day}. ${s.month}. ${s.year}`;
    }
    if (s.year === e.year) {
      return `${s.day}. ${s.month}. – ${e.day}. ${e.month}. ${s.year}`;
    }
    return `${s.day}. ${s.month}. ${s.year} – ${e.day}. ${e.month}. ${e.year}`;
  }

  if (s) {
    return `Od ${s.day}. ${s.month}. ${s.year}`;
  }

  if (e) {
    return `Do ${e.day}. ${e.month}. ${e.year}`;
  }

  return 'Termín neurčen';
}

/**
 * Sorts trips:
 * 1. Active and planning trips first, ordered chronologically by start date (closest date first).
 *    Trips without dates come after dated active trips.
 * 2. Completed / archived trips at the bottom, ordered chronologically or by end date.
 */
export function sortTrips(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const isACompleted = a.status === 'completed' || a.status === 'archived';
    const isBCompleted = b.status === 'completed' || b.status === 'archived';

    // 1. Completed trips go to the bottom
    if (!isACompleted && isBCompleted) return -1;
    if (isACompleted && !isBCompleted) return 1;

    // Both are either active/planning OR both are completed
    const dateA = a.start_date || a.end_date || '';
    const dateB = b.start_date || b.end_date || '';

    // Trips with dates come before trips without dates
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    if (dateA && dateB) {
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
    }

    // Fallback: title alphabetically
    return a.title.localeCompare(b.title, 'cs');
  });
}
