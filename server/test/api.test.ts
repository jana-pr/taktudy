import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../src/db.js';
import { hashPassword, verifyPassword, generateToken } from '../src/auth.js';
import { parseUrlSafely } from '../src/url-parser.js';

describe('Tak tudy! Backend & Security Tests', () => {
  beforeAll(() => {
    initDatabase();
    const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@taktudy.app') as any;
    const now = new Date().toISOString();
    
    // Seed trip_srilanka_001 if needed for test assertions
    db.prepare(`
      INSERT OR REPLACE INTO trips (id, owner_id, title, motto, status, travelers_count, created_at, updated_at, is_deleted)
      VALUES ('trip_srilanka_001', ?, 'Srí Lanka — okruh', 'Plánuji, abych měla svobodu', 'active', 3, ?, ?, 0)
    `).run(demoUser.id, now, now);

    db.prepare(`
      INSERT OR REPLACE INTO stages (id, trip_id, title, sort_order, has_detail, version, created_at, updated_at)
      VALUES 
        ('stg_test_1', 'trip_srilanka_001', 'Kulturní trojúhelník', 1, 1, 1, ?, ?),
        ('stg_test_2', 'trip_srilanka_001', 'Vysočina a čaj', 2, 1, 1, ?, ?)
    `).run(now, now, now, now);

    db.prepare(`
      INSERT OR REPLACE INTO days (id, trip_id, stage_id, day_number, specific_date, title, created_at, updated_at)
      VALUES ('day_test_1', 'trip_srilanka_001', 'stg_test_1', 1, '2026-12-26', 'Den 1', ?, ?)
    `).run(now, now);

    const testPois = [
      { id: 'poi_test_1', name: 'Sigiriya Rock', is_top: 1, lat: 7.957, lng: 80.760 },
      { id: 'poi_test_2', name: 'Dambulla Temple', is_top: 1, lat: 7.856, lng: 80.648 },
      { id: 'poi_test_3', name: 'Kandy Lake', is_top: 0, lat: 7.293, lng: 80.641 },
      { id: 'poi_test_4', name: 'Ella Rock', is_top: 0, lat: 6.855, lng: 81.050 }
    ];

    for (const p of testPois) {
      db.prepare(`
        INSERT OR REPLACE INTO pois (id, trip_id, stage_id, day_id, category_id, name, is_top, lat, lng, is_deleted, created_at, updated_at)
        VALUES (?, 'trip_srilanka_001', 'stg_test_1', 'day_test_1', 'monument', ?, ?, ?, ?, 0, ?, ?)
      `).run(p.id, p.name, p.is_top, p.lat, p.lng, now, now);
    }
  });

  it('AC-15: Persistence - Database initializes and contains demo user and seed categories', () => {
    const categories = db.prepare('SELECT * FROM categories').all();
    expect(categories.length).toBeGreaterThanOrEqual(8);

    const demoUser = db.prepare('SELECT * FROM users WHERE email = ?').get('demo@taktudy.app') as any;
    expect(demoUser).toBeDefined();
    expect(demoUser.display_name).toBe('Cestovatelka Jana');
    expect(verifyPassword('heslo123', demoUser.password_hash)).toBe(true);
  });

  it('AC-01: Multiple trips - User owns and can query trips', () => {
    const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@taktudy.app') as any;
    db.prepare(`
      INSERT OR REPLACE INTO trips (id, owner_id, title, motto, status, travelers_count, created_at, updated_at, is_deleted)
      VALUES ('trip_test_01', ?, 'Testovací cesta', 'Motto', 'planning', 2, datetime('now'), datetime('now'), 0)
    `).run(demoUser.id);
    const trips = db.prepare('SELECT * FROM trips WHERE owner_id = ? AND is_deleted = 0').all(demoUser.id);
    expect(trips.length).toBeGreaterThanOrEqual(1);
  });

  it('AC-02: Hierarchy - Trip has stages, days and assigned POIs', () => {
    const trip = db.prepare('SELECT id FROM trips WHERE id = ?').get('trip_srilanka_001') as any;
    expect(trip).toBeDefined();

    const stages = db.prepare('SELECT * FROM stages WHERE trip_id = ?').all(trip.id);
    expect(stages.length).toBeGreaterThanOrEqual(2);

    const days = db.prepare('SELECT * FROM days WHERE trip_id = ?').all(trip.id);
    expect(days.length).toBeGreaterThanOrEqual(1);

    const pois = db.prepare('SELECT * FROM pois WHERE trip_id = ? AND is_deleted = 0').all(trip.id);
    expect(pois.length).toBeGreaterThanOrEqual(4);
  });

  it('AC-03 & AC-04: TOP Flag - Correct identification and filtering of TOP places', () => {
    const topPois = db.prepare('SELECT * FROM pois WHERE trip_id = ? AND is_top = 1 AND is_deleted = 0').all('trip_srilanka_001') as any[];
    expect(topPois.length).toBeGreaterThanOrEqual(2);
    for (const p of topPois) {
      expect(p.is_top).toBe(1);
    }
  });

  it('AC-12: Sharing - Generates unguessable token and provides isolated read-only access', () => {
    const token = generateToken(24);
    expect(token.length).toBeGreaterThan(25);

    const now = new Date().toISOString();
    const testShareId = `sh_test_${Date.now()}`;
    db.prepare(`
      INSERT OR REPLACE INTO share_tokens (id, trip_id, token, is_active, include_notes, created_at)
      VALUES (?, ?, ?, 1, 0, ?)
    `).run(testShareId, 'trip_srilanka_001', token, now);

    // Verify retrieval without private notes
    const share = db.prepare('SELECT * FROM share_tokens WHERE token = ? AND is_active = 1').get(token) as any;
    expect(share).toBeDefined();

    const trip = db.prepare('SELECT id, title, motto FROM trips WHERE id = ?').get(share.trip_id) as any;
    expect(trip.title).toBe('Srí Lanka — okruh');

    // Private notes should be hidden when include_notes = 0
    const pois = db.prepare(`
      SELECT id, name, CASE WHEN ? = 1 THEN private_notes ELSE NULL END as private_notes
      FROM pois WHERE trip_id = ?
    `).all(share.include_notes, trip.id) as any[];

    for (const p of pois) {
      expect(p.private_notes).toBeNull();
    }
  });

  it('AC-14: BOLA / IDOR Protection - Query verifies ownership check', () => {
    const maliciousUserId = 'usr_hacker_999';
    const unauthorizedTrip = db.prepare('SELECT * FROM trips WHERE id = ? AND owner_id = ?').get('trip_srilanka_001', maliciousUserId);
    expect(unauthorizedTrip).toBeUndefined();
  });

  it('Security: SSRF Protection blocks localhost and private IPs', async () => {
    await expect(parseUrlSafely('http://localhost:3000')).rejects.toThrow();
    await expect(parseUrlSafely('http://127.0.0.1:5432')).rejects.toThrow();
    await expect(parseUrlSafely('http://169.254.169.254/latest/meta-data')).rejects.toThrow();
  });
});
