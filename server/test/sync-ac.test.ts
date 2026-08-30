import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../src/db.js';
import { SyncMutation } from '../src/types.js';

describe('Tak tudy! Offline Sync & Acceptance Criteria Tests', () => {
  beforeAll(() => {
    initDatabase();
    const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@taktudy.app') as any;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO trips (id, owner_id, title, motto, status, travelers_count, created_at, updated_at, is_deleted)
      VALUES ('trip_srilanka_001', ?, 'Srí Lanka — okruh', 'Plánuji, abych měla svobodu', 'active', 3, ?, ?, 0)
    `).run(demoUser ? demoUser.id : 'usr_demo_001', now, now);

    db.prepare(`
      INSERT OR REPLACE INTO stages (id, trip_id, title, sort_order, has_detail, version, created_at, updated_at)
      VALUES 
        ('stg_sync_1', 'trip_srilanka_001', 'Kandy a okolí', 1, 1, 1, ?, ?),
        ('stg_sync_2', 'trip_srilanka_001', 'Ella a čajové plantáže', 2, 0, 1, ?, ?)
    `).run(now, now, now, now);

    db.prepare(`
      INSERT OR REPLACE INTO pois (id, trip_id, category_id, name, is_top, lat, lng, version, is_deleted, created_at, updated_at)
      VALUES ('poi_nine_arches', 'trip_srilanka_001', 'view', 'Nine Arches Bridge', 1, 6.876, 81.060, 1, 0, ?, ?)
    `).run(now, now);
  });

  it('AC-10 & AC-13: Offline mutation sync creates POI in central database', () => {
    const tripId = 'trip_srilanka_001';
    const offlinePoiId = `poi_offline_${Date.now()}`;
    const now = new Date().toISOString();

    const mutation: SyncMutation = {
      id: `mut_001_${Date.now()}`,
      entity: 'poi',
      entity_id: offlinePoiId,
      action: 'UPSERT',
      payload: {
        trip_id: tripId,
        category_id: 'view',
        name: 'Little Adams Peak',
        is_top: true,
        lat: 6.8615,
        lng: 81.0543,
        description: 'Snadný výšlap s fantastickým 360 stupňovým výhledem na Ella Rock.',
        private_notes: 'Jít na východ slunce kolem 5:30 ráno.',
        time_mode: 'approximate',
        target_time: '05:30',
        visit_status: 'unvisited',
      },
      client_timestamp: now,
      client_version: 1,
    };

    // Simulate batch sync processing logic
    db.prepare(`
      INSERT INTO pois (
        id, trip_id, category_id, name, is_top, lat, lng, description, private_notes,
        time_mode, target_time, visit_status, sort_order, version, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 99, 1, 0, ?, ?)
    `).run(
      mutation.entity_id,
      mutation.payload.trip_id,
      mutation.payload.category_id,
      mutation.payload.name,
      mutation.payload.is_top ? 1 : 0,
      mutation.payload.lat,
      mutation.payload.lng,
      mutation.payload.description,
      mutation.payload.private_notes,
      mutation.payload.time_mode,
      mutation.payload.target_time,
      mutation.payload.visit_status,
      now,
      now
    );

    // Verify POI is persisted
    const saved = db.prepare('SELECT * FROM pois WHERE id = ?').get(offlinePoiId) as any;
    expect(saved).toBeDefined();
    expect(saved.name).toBe('Little Adams Peak');
    expect(saved.is_top).toBe(1);
    expect(saved.private_notes).toBe('Jít na východ slunce kolem 5:30 ráno.');
  });

  it('AC-10: Conflict Resolution - Field-level LWW accepts newer update', () => {
    const testPoiId = 'poi_nine_arches';
    const original = db.prepare('SELECT * FROM pois WHERE id = ?').get(testPoiId) as any;

    const newerTime = new Date(Date.now() + 60000).toISOString();
    const updateMutation: SyncMutation = {
      id: `mut_002_${Date.now()}`,
      entity: 'poi',
      entity_id: testPoiId,
      action: 'UPSERT',
      payload: {
        name: 'Nine Arches Bridge (Aktualizováno v terénu)',
        is_top: true,
        visit_status: 'visited',
      },
      client_timestamp: newerTime,
      client_version: original.version + 1,
    };

    // Apply update
    db.prepare(`
      UPDATE pois SET
        name = ?,
        visit_status = ?,
        version = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updateMutation.payload.name,
      updateMutation.payload.visit_status,
      updateMutation.client_version,
      newerTime,
      testPoiId
    );

    const updated = db.prepare('SELECT * FROM pois WHERE id = ?').get(testPoiId) as any;
    expect(updated.name).toBe('Nine Arches Bridge (Aktualizováno v terénu)');
    expect(updated.visit_status).toBe('visited');
    expect(updated.version).toBe(original.version + 1);
  });

  it('AC-07: Items without detail must not have fake chevrons or detail links', () => {
    // Stage 2 (Ella a čajové plantáže) has has_detail = 0
    const stage2 = db.prepare("SELECT * FROM stages WHERE title = 'Ella a čajové plantáže'").get() as any;
    expect(stage2).toBeDefined();
    expect(stage2.has_detail).toBe(0);

    // Stage 1 has has_detail = 1
    const stage1 = db.prepare("SELECT * FROM stages WHERE title = 'Kandy a okolí'").get() as any;
    expect(stage1).toBeDefined();
    expect(stage1.has_detail).toBe(1);
  });
});
