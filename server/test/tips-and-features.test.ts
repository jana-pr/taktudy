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

  it('4. Robustní import z ChatGPT: vnořená místa ve dnech, české klíče, chytré uvozovky a čárky navíc', () => {
    const rawGptSnippet = `
    Tady je návrh trasy pro tvou dovolenou:
    \`\`\`json
    {
      “nazev”: “Krásy Cejlonu 2026”,
      “oblast”: “Srí Lanka”,
      “dny”: [
        {
          “den”: 1,
          “nazev”: “Přílet do Colomba a transfer do Galle”, // komentář
          “mista”: [
            { “nazev”: “Pevnost Galle Fort”, “kategorie”: “monument”, “popis”: “Historická pevnost UNESCO” },
            { “nazev”: “Maják v Galle”, “kategorie”: “view” },
          ],
        },
        {
          “den”: 2,
          “nazev”: “Pláže a relax v Mirisse”,
          “places”: [
            “Kokosový kopec Coconut Tree Hill”,
          ],
        },
      ],
    }
    \`\`\`
    Šťastnou cestu!
    `;

    const parsed = parseRouteFile(rawGptSnippet, 'chatgpt-plan.json');
    expect(parsed.title).toBe('Krásy Cejlonu 2026');
    expect(parsed.days.length).toBe(2);
    expect(parsed.pois.length).toBe(3); // 2 from day 1, 1 from day 2
    expect(parsed.pois.some((p) => p.name === 'Pevnost Galle Fort')).toBe(true);
    expect(parsed.pois.some((p) => p.name === 'Kokosový kopec Coconut Tree Hill')).toBe(true);
  });

  it('5. Ubytování: vytvoření, úprava, GPS souřadnice pro mapu a smazání', () => {
    const accId = 'acc_test_unique_001';
    const now = new Date().toISOString();

    // Insert accommodation with GPS
    db.prepare(`
      INSERT INTO accommodations (
        id, trip_id, hotel_name, location, lat, lng, price_total, price_single, room_type,
        breakfast_included, booking_status, created_at, updated_at
      ) VALUES (?, ?, 'Habarana Eco Lodge', 'Habarana', 8.0336, 80.7516, 120, 85, 'Garden Bungalow', 1, 'confirmed', ?, ?)
    `).run(accId, createdTripId, now, now);

    const created = db.prepare('SELECT * FROM accommodations WHERE id = ?').get(accId) as any;
    expect(created).toBeDefined();
    expect(created.hotel_name).toBe('Habarana Eco Lodge');
    expect(created.lat).toBe(8.0336);
    expect(created.lng).toBe(80.7516);
    expect(created.price_total).toBe(120);

    // Update
    db.prepare('UPDATE accommodations SET price_total = ?, room_type = ? WHERE id = ?').run(140, 'Deluxe Bungalow', accId);
    const updated = db.prepare('SELECT * FROM accommodations WHERE id = ?').get(accId) as any;
    expect(updated.price_total).toBe(140);
    expect(updated.room_type).toBe('Deluxe Bungalow');

    // Delete
    db.prepare('DELETE FROM accommodations WHERE id = ?').run(accId);
    const deleted = db.prepare('SELECT * FROM accommodations WHERE id = ?').get(accId);
    expect(deleted).toBeUndefined();
  });

  it('6. Rezervace: vytvoření, uložení kódu voucheru, aktualizace a smazání', () => {
    const bkgId = 'bkg_test_unique_001';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO bookings (
        id, trip_id, type, title, provider, confirmation_number, price, currency,
        status, contact_phone, created_at, updated_at
      ) VALUES (?, ?, 'flight', 'Letenky do Colomba', 'Qatar Airways', 'QR-9988', 2100, 'USD', 'confirmed', '+420 222 333', ?, ?)
    `).run(bkgId, createdTripId, now, now);

    const bkg = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bkgId) as any;
    expect(bkg).toBeDefined();
    expect(bkg.title).toBe('Letenky do Colomba');
    expect(bkg.confirmation_number).toBe('QR-9988');
    expect(bkg.price).toBe(2100);

    // Delete
    db.prepare('DELETE FROM bookings WHERE id = ?').run(bkgId);
    const deleted = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bkgId);
    expect(deleted).toBeUndefined();
  });

  it('7. Import a úprava cesty: Zkopírování JSONu jako text obsahující URL adresy (https://), komentáře a konverzační úvod z ChatGPT', () => {
    const rawGptInput = `Dobrý den, tady je upravený plán vaší cesty po Srí Lance:
\`\`\`json
{
  "title": "Srí Lanka Vánoce 2026 - Z ChatGPT",
  "country_region": "Srí Lanka",
  "motto": "Krásný okruh s ubytováním a zážitky",
  "start_date": "2026-12-26",
  "end_date": "2027-01-08",
  "url": "https://www.booking.com/hotel/lk/cinnamon-grand.cs.html", // odkaz na ubytování
  "days": [
    {
      "day_number": 1,
      "title": "Den 1 - Přílet do Colomba",
      "overnight_location": "Cinnamon Grand Colombo",
      "pois": [
        {
          "name": "Letiště Bandaranaike CMB",
          "lat": 7.1808,
          "lng": 79.8841,
          "category_id": "transport",
          "source_url": "https://airport.lk/colombo-terminal",
        }
      ]
    },
    {
      "day_number": 2,
      "title": "Den 2 - Přesun do Dambully",
      "overnight_location": "Heritance Kandalama",
      "pois": [
        {
          "name": "Jeskynní chrám Dambulla",
          "lat": 7.8567,
          "lng": 80.6483,
          "category_id": "monument",
          "source_url": "https://maps.google.com/?q=7.8567,80.6483",
        }
      ]
    }
  ],
  "accommodations": [
    {
      "hotel_name": "Cinnamon Grand Colombo",
      "day_number": 1,
      "booking_url": "https://booking.com/cinnamon",
      "price_total": 130
    }
  ]
}
\`\`\`
Doufám, že se vám nový itinerář bude líbit! Dejte vědět, pokud budete chtít cokoliv upravit.`;

    const parsed = parseRouteFile(rawGptInput, 'chatgpt-plan.json');
    expect(parsed.title).toBe('Srí Lanka Vánoce 2026 - Z ChatGPT');
    expect(parsed.days.length).toBe(2);
    expect(parsed.pois.length).toBe(2);
    expect(parsed.pois[0].name).toBe('Letiště Bandaranaike CMB');
    expect(parsed.pois[1].name).toBe('Jeskynní chrám Dambulla');
    expect(parsed.accommodations).toBeDefined();
    expect(parsed.accommodations!.length).toBeGreaterThanOrEqual(1);
    expect(parsed.accommodations![0].hotel_name).toBe('Cinnamon Grand Colombo');
  });
});
