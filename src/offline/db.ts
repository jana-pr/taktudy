import Dexie, { type Table } from 'dexie';
import { Trip, POI, SyncMutation } from '../types';

export class TakTudyDatabase extends Dexie {
  cachedTrips!: Table<Trip, string>;
  cachedPois!: Table<POI, string>;
  outboxMutations!: Table<SyncMutation, string>;
  cachedMapTiles!: Table<{ key: string; data: ArrayBuffer; timestamp: number }, string>;

  constructor() {
    super('TakTudyOfflineDB');
    this.version(1).stores({
      cachedTrips: 'id, owner_id, status, updated_at',
      cachedPois: 'id, trip_id, day_id, stage_id, category_id, is_top, visit_status, sort_order',
      outboxMutations: 'id, entity, entity_id, client_timestamp',
      cachedMapTiles: 'key, timestamp',
    });
  }
}

export const offlineDb = new TakTudyDatabase();
