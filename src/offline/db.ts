import Dexie, { type Table } from 'dexie';
import { Trip, FullTrip, POI, Stage, Day, Accommodation, Booking, Reminder, SyncMutation } from '../types';

export interface FullTripVaultItem {
  id: string;
  title: string;
  data: FullTrip;
  updated_at: string;
}

export class TakTudyDatabase extends Dexie {
  cachedTrips!: Table<Trip, string>;
  cachedStages!: Table<Stage, string>;
  cachedDays!: Table<Day, string>;
  cachedPois!: Table<POI, string>;
  cachedAccommodations!: Table<Accommodation, string>;
  cachedBookings!: Table<Booking, string>;
  cachedReminders!: Table<Reminder, string>;
  fullTripsVault!: Table<FullTripVaultItem, string>;
  outboxMutations!: Table<SyncMutation, string>;
  cachedMapTiles!: Table<{ key: string; data: ArrayBuffer; timestamp: number }, string>;

  constructor() {
    super('TakTudyOfflineDB');

    // Version 1 (legacy schema)
    this.version(1).stores({
      cachedTrips: 'id, owner_id, status, updated_at',
      cachedPois: 'id, trip_id, day_id, stage_id, category_id, is_top, visit_status, sort_order',
      outboxMutations: 'id, entity, entity_id, client_timestamp',
      cachedMapTiles: 'key, timestamp',
    });

    // Version 2: Complete multi-table architecture + Full Trip Vault
    this.version(2).stores({
      cachedTrips: 'id, owner_id, status, updated_at',
      cachedStages: 'id, trip_id, sort_order',
      cachedDays: 'id, trip_id, day_number, specific_date',
      cachedPois: 'id, trip_id, day_id, stage_id, category_id, is_top, visit_status, sort_order',
      cachedAccommodations: 'id, trip_id, day_id',
      cachedBookings: 'id, trip_id',
      cachedReminders: 'id, trip_id, remind_at',
      fullTripsVault: 'id, title, updated_at',
      outboxMutations: 'id, entity, entity_id, client_timestamp',
      cachedMapTiles: 'key, timestamp',
    });
  }

  /**
   * Save a full trip atomically across all relational tables and the vault.
   * Also updates localStorage fallback vault for 100% data preservation.
   */
  async saveFullTrip(fullTrip: FullTrip): Promise<void> {
    if (!fullTrip || !fullTrip.id) return;

    const tripHeader: Trip = {
      id: fullTrip.id,
      owner_id: fullTrip.owner_id || 'usr_demo_001',
      title: fullTrip.title,
      motto: fullTrip.motto || null,
      status: fullTrip.status || 'planning',
      country_region: fullTrip.country_region || null,
      travelers_count: fullTrip.travelers_count || 3,
      primary_transport: fullTrip.primary_transport || 'Soukromé auto s řidičem',
      room_scenario: fullTrip.room_scenario || '2+1',
      budget_currency: fullTrip.budget_currency || 'USD',
      notes: fullTrip.notes || null,
      start_date: fullTrip.start_date || null,
      end_date: fullTrip.end_date || null,
      bounding_box: fullTrip.bounding_box || null,
      route_url: fullTrip.route_url || null,
      version: fullTrip.version || 1,
      poi_count: Array.isArray(fullTrip.pois) ? fullTrip.pois.length : 0,
      day_count: Array.isArray(fullTrip.days) ? fullTrip.days.length : 0,
      created_at: fullTrip.created_at || new Date().toISOString(),
      updated_at: fullTrip.updated_at || new Date().toISOString(),
    };

    const now = new Date().toISOString();

    await this.transaction(
      'rw',
      [
        this.cachedTrips,
        this.cachedStages,
        this.cachedDays,
        this.cachedPois,
        this.cachedAccommodations,
        this.cachedBookings,
        this.cachedReminders,
        this.fullTripsVault,
      ],
      async () => {
        // 1. Put Trip Header
        await this.cachedTrips.put(tripHeader);

        // 2. Put Stages
        if (Array.isArray(fullTrip.stages)) {
          await this.cachedStages.where('trip_id').equals(fullTrip.id).delete();
          if (fullTrip.stages.length > 0) {
            await this.cachedStages.bulkPut(fullTrip.stages);
          }
        }

        // 3. Put Days
        if (Array.isArray(fullTrip.days)) {
          await this.cachedDays.where('trip_id').equals(fullTrip.id).delete();
          if (fullTrip.days.length > 0) {
            await this.cachedDays.bulkPut(fullTrip.days);
          }
        }

        // 4. Put POIs
        if (Array.isArray(fullTrip.pois)) {
          await this.cachedPois.where('trip_id').equals(fullTrip.id).delete();
          if (fullTrip.pois.length > 0) {
            await this.cachedPois.bulkPut(fullTrip.pois);
          }
        }

        // 5. Put Accommodations
        if (Array.isArray(fullTrip.accommodations)) {
          await this.cachedAccommodations.where('trip_id').equals(fullTrip.id).delete();
          if (fullTrip.accommodations.length > 0) {
            await this.cachedAccommodations.bulkPut(fullTrip.accommodations);
          }
        }

        // 6. Put Bookings
        if (Array.isArray(fullTrip.bookings)) {
          await this.cachedBookings.where('trip_id').equals(fullTrip.id).delete();
          if (fullTrip.bookings.length > 0) {
            await this.cachedBookings.bulkPut(fullTrip.bookings);
          }
        }

        // 7. Put Reminders
        if (Array.isArray(fullTrip.reminders)) {
          await this.cachedReminders.where('trip_id').equals(fullTrip.id).delete();
          if (fullTrip.reminders.length > 0) {
            await this.cachedReminders.bulkPut(fullTrip.reminders);
          }
        }

        // 8. Put into Full Trip Vault
        await this.fullTripsVault.put({
          id: fullTrip.id,
          title: fullTrip.title,
          data: fullTrip,
          updated_at: fullTrip.updated_at || now,
        });
      }
    );

    // Also mirror to localStorage for ultra-reliable backup
    try {
      this.syncLocalStorageVault();
    } catch {}
  }

  /**
   * Retrieve a full trip from Vault or reconstruct from relational tables
   */
  async getFullTrip(id: string): Promise<FullTrip | null> {
    // 1. Try vault first (fastest and most complete)
    const vaultItem = await this.fullTripsVault.get(id);
    if (vaultItem && vaultItem.data && Array.isArray(vaultItem.data.days) && vaultItem.data.days.length > 0) {
      return vaultItem.data;
    }

    // 2. Fallback: reconstruct from tables
    const trip = await this.cachedTrips.get(id);
    if (!trip) return null;

    const [stages, days, pois, accommodations, bookings, reminders] = await Promise.all([
      this.cachedStages.where('trip_id').equals(id).sortBy('sort_order'),
      this.cachedDays.where('trip_id').equals(id).sortBy('day_number'),
      this.cachedPois.where('trip_id').equals(id).sortBy('sort_order'),
      this.cachedAccommodations.where('trip_id').equals(id).toArray(),
      this.cachedBookings.where('trip_id').equals(id).toArray(),
      this.cachedReminders.where('trip_id').equals(id).toArray(),
    ]);

    const reconstructed: FullTrip = {
      ...trip,
      stages: stages || [],
      days: days || [],
      subRoutes: [],
      pois: pois || [],
      accommodations: accommodations || [],
      bookings: bookings || [],
      reminders: reminders || [],
    };

    return reconstructed;
  }

  /**
   * Get all Full Trips available in local storage
   */
  async getAllFullTrips(): Promise<FullTrip[]> {
    const vaultItems = await this.fullTripsVault.toArray();
    if (vaultItems.length > 0) {
      return vaultItems.map((v) => v.data);
    }

    // Fallback: iterate cachedTrips
    const trips = await this.cachedTrips.toArray();
    const result: FullTrip[] = [];
    for (const t of trips) {
      const full = await this.getFullTrip(t.id);
      if (full) result.push(full);
    }
    return result;
  }

  /**
   * Delete full trip from all stores
   */
  async deleteFullTrip(id: string): Promise<void> {
    await this.transaction(
      'rw',
      [
        this.cachedTrips,
        this.cachedStages,
        this.cachedDays,
        this.cachedPois,
        this.cachedAccommodations,
        this.cachedBookings,
        this.cachedReminders,
        this.fullTripsVault,
      ],
      async () => {
        await this.cachedTrips.delete(id);
        await this.cachedStages.where('trip_id').equals(id).delete();
        await this.cachedDays.where('trip_id').equals(id).delete();
        await this.cachedPois.where('trip_id').equals(id).delete();
        await this.cachedAccommodations.where('trip_id').equals(id).delete();
        await this.cachedBookings.where('trip_id').equals(id).delete();
        await this.cachedReminders.where('trip_id').equals(id).delete();
        await this.fullTripsVault.delete(id);
      }
    );
    try {
      this.syncLocalStorageVault();
    } catch {}
  }

  /**
   * Clear all local stores
   */
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.cachedTrips.clear(),
      this.cachedStages.clear(),
      this.cachedDays.clear(),
      this.cachedPois.clear(),
      this.cachedAccommodations.clear(),
      this.cachedBookings.clear(),
      this.cachedReminders.clear(),
      this.fullTripsVault.clear(),
      this.outboxMutations.clear(),
    ]);
    try {
      localStorage.removeItem('taktudy_vault_backup');
    } catch {}
  }

  /**
   * Background sync of vault to localStorage as a safety net
   */
  private async syncLocalStorageVault() {
    try {
      const vaultItems = await this.fullTripsVault.toArray();
      const payload = vaultItems.map((v) => v.data);
      localStorage.setItem('taktudy_vault_backup', JSON.stringify(payload));
    } catch (e) {
      // localStorage quota exceeded or disabled - fail silently
    }
  }

  /**
   * Load any trips saved in localStorage fallback if Dexie was ever reset
   */
  async loadFallbackFromLocalStorage(): Promise<number> {
    try {
      const raw = localStorage.getItem('taktudy_vault_backup');
      if (!raw) return 0;
      const trips: FullTrip[] = JSON.parse(raw);
      if (!Array.isArray(trips) || trips.length === 0) return 0;

      let count = 0;
      for (const trip of trips) {
        if (trip && trip.id && trip.title) {
          await this.saveFullTrip(trip);
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }
}

export const offlineDb = new TakTudyDatabase();
