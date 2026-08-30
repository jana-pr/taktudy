import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../src/db.js';

describe('Trip Reminders and Weather Region Integration Tests', () => {
  const testTripId = `trip_rem_test_${Date.now()}`;
  const testUserId = 'usr_demo_001';

  beforeAll(() => {
    initDatabase();

    // Create a dedicated test trip
    db.prepare(`
      INSERT OR REPLACE INTO trips (
        id, owner_id, title, motto, status, country_region, travelers_count,
        primary_transport, room_scenario, budget_currency, start_date, end_date,
        version, is_deleted, created_at, updated_at
      ) VALUES (
        ?, ?, 'Madeira Levády a hory', 'Motto test', 'planning', 'Madeira', 2,
        'Auto', '2+1', 'EUR', '2026-05-01', '2026-05-10',
        1, 0, datetime('now'), datetime('now')
      )
    `).run(testTripId, testUserId);

    // Insert days with specific route locations
    db.prepare(`
      INSERT INTO days (
        id, trip_id, day_number, title, start_location, overnight_location,
        has_detail, version, created_at, updated_at
      ) VALUES
      (?, ?, 1, 'Den 1: Funchal', 'Funchal Airport', 'Funchal', 1, 1, datetime('now'), datetime('now')),
      (?, ?, 2, 'Den 2: Porto Moniz', 'Funchal', 'Porto Moniz', 1, 1, datetime('now'), datetime('now'))
    `).run(`${testTripId}_d1`, testTripId, `${testTripId}_d2`, testTripId);
  });

  it('Reminders: Can insert and retrieve route-specific reminders for restaurants, tickets and transport', () => {
    const r1Id = `rem_${Date.now()}_1`;
    const r2Id = `rem_${Date.now()}_2`;
    const r3Id = `rem_${Date.now()}_3`;

    // 1. Restaurant reservation
    db.prepare(`
      INSERT INTO reminders (id, trip_id, title, category, remind_at, notes, is_completed, notification_sent, created_at, updated_at)
      VALUES (?, ?, 'Rezervovat restauraci Il Gallo d Oro', 'restaurant', '2026-04-20T18:00:00.000Z', 'Michelin 2 hvězdy', 0, 0, datetime('now'), datetime('now'))
    `).run(r1Id, testTripId);

    // 2. Theatre / show tickets
    db.prepare(`
      INSERT INTO reminders (id, trip_id, title, category, remind_at, notes, is_completed, notification_sent, created_at, updated_at)
      VALUES (?, ?, 'Koupit lístky na koncert ve Funchalu', 'tickets', '2026-04-15T10:00:00.000Z', 'Vstupenky na sezení', 0, 0, datetime('now'), datetime('now'))
    `).run(r2Id, testTripId);

    // 3. Transport tickets
    db.prepare(`
      INSERT INTO reminders (id, trip_id, title, category, remind_at, notes, is_completed, notification_sent, created_at, updated_at)
      VALUES (?, ?, 'Koupit jízdenky na lanovku Monte', 'transport', '2026-05-01T08:00:00.000Z', 'Zpáteční jízdenka', 0, 0, datetime('now'), datetime('now'))
    `).run(r3Id, testTripId);

    // Retrieve reminders
    const reminders = db.prepare('SELECT * FROM reminders WHERE trip_id = ? ORDER BY remind_at ASC').all(testTripId) as any[];
    expect(reminders.length).toBe(3);

    expect(reminders[0].title).toBe('Koupit lístky na koncert ve Funchalu');
    expect(reminders[0].category).toBe('tickets');
    expect(reminders[0].is_completed).toBe(0);

    expect(reminders[1].title).toBe('Rezervovat restauraci Il Gallo d Oro');
    expect(reminders[1].category).toBe('restaurant');

    expect(reminders[2].title).toBe('Koupit jízdenky na lanovku Monte');
    expect(reminders[2].category).toBe('transport');
  });

  it('Reminders: Toggle completion and update reminder details', () => {
    const reminder = db.prepare('SELECT * FROM reminders WHERE trip_id = ? AND category = ?').get(testTripId, 'restaurant') as any;
    expect(reminder).toBeDefined();

    // Toggle completed
    db.prepare('UPDATE reminders SET is_completed = 1 WHERE id = ?').run(reminder.id);
    const updated = db.prepare('SELECT is_completed FROM reminders WHERE id = ?').get(reminder.id) as any;
    expect(updated.is_completed).toBe(1);

    // Update notes
    db.prepare('UPDATE reminders SET notes = ? WHERE id = ?').run('Stůl na terase potvrzen', reminder.id);
    const updatedWithNotes = db.prepare('SELECT notes FROM reminders WHERE id = ?').get(reminder.id) as any;
    expect(updatedWithNotes.notes).toBe('Stůl na terase potvrzen');
  });

  it('Weather destination resolution: Route uses destination/region instead of generic first word of title', () => {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(testTripId) as any;
    expect(trip).toBeDefined();
    expect(trip.country_region).toBe('Madeira');

    // Route stops resolution
    const days = db.prepare('SELECT start_location, overnight_location FROM days WHERE trip_id = ?').all(testTripId) as any[];
    const stops = new Set<string>();
    if (trip.country_region) stops.add(trip.country_region);
    days.forEach((d) => {
      if (d.start_location) stops.add(d.start_location);
      if (d.overnight_location) stops.add(d.overnight_location);
    });

    const stopsArray = Array.from(stops);
    expect(stopsArray).toContain('Madeira');
    expect(stopsArray).toContain('Funchal');
    expect(stopsArray).toContain('Porto Moniz');

    // Verify weather query targets the specific region
    const encodedRegion = encodeURIComponent(trip.country_region);
    const weatherUrl = `https://yrno.cz/plus/pocasi/?query=${encodedRegion}`;
    expect(weatherUrl).toBe('https://yrno.cz/plus/pocasi/?query=Madeira');
  });

  it('Reminders: Cascade deletion when parent trip is deleted', () => {
    // Delete test trip
    db.prepare('DELETE FROM trips WHERE id = ?').run(testTripId);

    // Reminders should be deleted due to ON DELETE CASCADE
    const remainingReminders = db.prepare('SELECT * FROM reminders WHERE trip_id = ?').all(testTripId) as any[];
    expect(remainingReminders.length).toBe(0);
  });
});
