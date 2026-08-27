import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, db, seedSriLanka2026Trip } from '../src/db.js';
import { parseRouteFile } from '../src/importers/route-importer.js';

describe('Tak tudy! — 4 nové funkce (Smazání, Re-import z ChatGPT, Export, Zásobárna tipů)', () => {
  const testUserId = 'usr_demo_001';
  let createdTripId = 'trip_test_features_001';

  beforeAll(() => {
    initDatabase();

    // Create a dedicated test trip
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO trips (
        id, owner_id, title, motto, status, country_region, travelers_count,
        primary_transport, room_scenario, budget_currency, notes,
        start_date, end_date, version, is_deleted, created_at, updated_at
      ) VALUES (?, ?, 'Testovací cesta na smazání a úpravu', 'Motto test', 'planning', 'Srí Lanka', 3, 'Auto', '2+1', 'USD', null, '2026-12-26', '2027-01-10', 1, 0, ?, ?)
    `).run(createdTripId, testUserId, now, now);

    // Add 1 test day and 1 test poi
    const dayId = 'day_test_001';
    db.prepare(`
      INSERT OR REPLACE INTO days (id, trip_id, day_number, title, has_detail, version, created_at, updated_at)
      VALUES (?, ?, 1, 'Den 1: Přílet', 1, 1, ?, ?)
    `).run(dayId, createdTripId, now, now);

    db.prepare(`
      INSERT OR REPLACE INTO pois (
        id, trip_id, day_id, category_id, name, lat, lng, is_mandatory, is_enabled, sort_order, created_at, updated_at
      ) VALUES ('poi_test_001', ?, ?, 'other', 'Letiště Colombo', 7.1808, 79.8841, 1, 1, 1, ?, ?)
    `).run(createdTripId, dayId, now, now);
  });

  it('1. Re-import / Nahrazení trasy z ChatGPT: nahradí dny i místa novým obsahem a zachová trip ID', () => {
    const rawChatGptText = `Zde je nový upravený itinerář z ChatGPT:
    \`\`\`json
    {
      "title": "Srí Lanka 2026 - Nová verze",
      "country_region": "Srí Lanka",
      "travelers_count": 3,
      "primary_transport": "Soukromé auto s řidičem",
      "days": [
        { "day_number": 1, "title": "Přílet a Negombo", "start_location": "CMB", "overnight_location": "Negombo" },
        { "day_number": 2, "title": "Cesta do Sigiriya", "start_location": "Negombo", "overnight_location": "Sigiriya" }
      ],
      "pois": [
        { "name": "Lví skála Sigiriya", "lat": 7.9570, "lng": 80.7603, "category_id": "monument", "day_number": 2 }
      ]
    }
    \`\`\`
    Přeji hezkou cestu!`;

    const parsed = parseRouteFile(rawChatGptText, 'chatgpt-plan.json');
    expect(parsed.title).toBe('Srí Lanka 2026 - Nová verze');
    expect(parsed.days.length).toBe(2);
    expect(parsed.pois.length).toBe(1);

    // Simulate replace transaction
    const now = new Date().toISOString();
    db.prepare('DELETE FROM sub_routes WHERE trip_id = ?').run(createdTripId);
    db.prepare('DELETE FROM pois WHERE trip_id = ?').run(createdTripId);
    db.prepare('DELETE FROM days WHERE trip_id = ?').run(createdTripId);

    const dayMap = new Map<number, string>();
    for (const d of parsed.days) {
      const dId = `day_${d.day_number}_${Date.now()}`;
      dayMap.set(d.day_number, dId);
      db.prepare(`
        INSERT INTO days (id, trip_id, day_number, title, has_detail, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 1, ?, ?)
      `).run(dId, createdTripId, d.day_number, d.title, now, now);
    }

    parsed.pois.forEach((p, idx) => {
      const dId = dayMap.get(p.day_number || 1);
      db.prepare(`
        INSERT INTO pois (id, trip_id, day_id, category_id, name, lat, lng, is_mandatory, is_enabled, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
      `).run(`poi_new_${idx}`, createdTripId, dId, p.category_id, p.name, p.lat, p.lng, idx + 1, now, now);
    });

    // Verify database state
    const daysInDb = db.prepare('SELECT * FROM days WHERE trip_id = ?').all(createdTripId);
    expect(daysInDb.length).toBe(2);

    const poisInDb = db.prepare('SELECT * FROM pois WHERE trip_id = ?').all(createdTripId);
    expect(poisInDb.length).toBe(1);
    expect((poisInDb[0] as any).name).toBe('Lví skála Sigiriya');
  });

  it('2. Zásobárna tipů: Uložení nového tipu, vyhledání a povýšení do itineráře', () => {
    const tipId = 'tip_test_mirissa_beach';
    const now = new Date().toISOString();

    // Insert tip
    db.prepare(`
      INSERT OR REPLACE INTO tips (
        id, user_id, trip_id, title, category_id, location_name, lat, lng, notes, is_used, created_at, updated_at
      ) VALUES (?, ?, ?, 'Tajná pláž Secret Beach', 'nature', 'Mirissa', 5.948, 80.452, 'Skrytá zátoka za kopcem', 0, ?, ?)
    `).run(tipId, testUserId, createdTripId, now, now);

    // Retrieve tip
    const retrieved = db.prepare('SELECT * FROM tips WHERE id = ?').get(tipId) as any;
    expect(retrieved).toBeDefined();
    expect(retrieved.title).toBe('Tajná pláž Secret Beach');
    expect(retrieved.is_used).toBe(0);

    // Promote to itinerary
    const firstDay = db.prepare('SELECT id FROM days WHERE trip_id = ? LIMIT 1').get(createdTripId) as any;
    expect(firstDay).toBeDefined();

    const newPoiId = `poi_promoted_${Date.now()}`;
    db.prepare(`
      INSERT INTO pois (id, trip_id, day_id, category_id, name, lat, lng, description, is_mandatory, is_enabled, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 99, ?, ?)
    `).run(newPoiId, createdTripId, firstDay.id, retrieved.category_id, retrieved.title, retrieved.lat, retrieved.lng, retrieved.notes, now, now);

    // Mark tip as used
    db.prepare('UPDATE tips SET is_used = 1, updated_at = ? WHERE id = ?').run(now, tipId);

    const updatedTip = db.prepare('SELECT is_used FROM tips WHERE id = ?').get(tipId) as any;
    expect(updatedTip.is_used).toBe(1);

    const promotedPoi = db.prepare('SELECT * FROM pois WHERE id = ?').get(newPoiId) as any;
    expect(promotedPoi.name).toBe('Tajná pláž Secret Beach');
  });

  it('3. Smazání cesty: označením is_deleted = 1', () => {
    const now = new Date().toISOString();
    db.prepare('UPDATE trips SET is_deleted = 1, updated_at = ? WHERE id = ?').run(now, createdTripId);

    const deletedTrip = db.prepare('SELECT is_deleted FROM trips WHERE id = ?').get(createdTripId) as any;
    expect(deletedTrip.is_deleted).toBe(1);
  });
});
