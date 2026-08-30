import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { z } from 'zod';
import crypto from 'node:crypto';
import { parseRouteFile } from '../importers/route-importer.js';
import { proposeTrip, optimizeRoute } from '../services/ai-planner.js';

const CreateTripSchema = z.object({
  title: z.string().min(1),
  motto: z.string().optional(),
  status: z.enum(['idea', 'planning', 'ready', 'traveling', 'completed', 'archived']).default('planning'),
  country_region: z.string().optional(),
  travelers_count: z.number().int().positive().default(3),
  primary_transport: z.string().optional(),
  room_scenario: z.enum(['2+1', 'triple']).default('2+1'),
  budget_currency: z.string().default('USD'),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  routeUrl: z.string().optional(),
});

const UpdateTripSchema = CreateTripSchema.partial();

export const tripRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // List all user's trips (including seeded demo/Sri Lanka trip)
  fastify.get('/', async (request) => {
    const userId = (request.user as any).id;
    const trips = db
      .prepare(`
        SELECT t.*, 
               (SELECT COUNT(*) FROM pois p WHERE p.trip_id = t.id AND p.is_deleted = 0) as poi_count,
               (SELECT COUNT(*) FROM days d WHERE d.trip_id = t.id) as day_count
        FROM trips t
        WHERE (t.owner_id = ? OR t.id = 'trip_srilanka_2026') AND t.is_deleted = 0
        ORDER BY t.created_at DESC
      `)
      .all(userId);

    return trips.map((t: any) => ({
      ...t,
      is_deleted: Boolean(t.is_deleted),
      bounding_box: t.bounding_box ? JSON.parse(t.bounding_box) : null,
    }));
  });

  // Get specific trip with full tree (BOLA checked)
  fastify.get('/:id', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const trip = db
      .prepare(`
        SELECT * FROM trips 
        WHERE id = ? AND (owner_id = ? OR id = 'trip_srilanka_2026') AND is_deleted = 0
      `)
      .get(id, userId) as any;

    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena nebo k ní nemáte přístup.' });
    }

    const stages = db
      .prepare('SELECT * FROM stages WHERE trip_id = ? ORDER BY sort_order ASC')
      .all(id)
      .map((s: any) => ({ ...s, has_detail: Boolean(s.has_detail) }));

    const days = db
      .prepare('SELECT * FROM days WHERE trip_id = ? ORDER BY day_number ASC')
      .all(id)
      .map((d: any) => ({ ...d, has_detail: Boolean(d.has_detail) }));

    const subRoutes = db
      .prepare('SELECT * FROM sub_routes WHERE trip_id = ?')
      .all(id)
      .map((sr: any) => ({ ...sr, coordinates: JSON.parse(sr.coordinates || '[]') }));

    const pois = db
      .prepare(`
        SELECT p.*, c.label_cs as category_label, c.icon_name as category_icon, c.default_color as category_color
        FROM pois p
        JOIN categories c ON p.category_id = c.id
        WHERE p.trip_id = ? AND p.is_deleted = 0
        ORDER BY p.sort_order ASC
      `)
      .all(id)
      .map((p: any) => ({
        ...p,
        is_top: Boolean(p.is_top),
        is_mandatory: p.is_mandatory === undefined ? true : Boolean(p.is_mandatory),
        is_enabled: p.is_enabled === undefined ? true : Boolean(p.is_enabled),
        is_deleted: Boolean(p.is_deleted),
        external_links: p.external_links ? JSON.parse(p.external_links) : [],
        notification_config: p.notification_config ? JSON.parse(p.notification_config) : null,
        photos: p.photos ? JSON.parse(p.photos) : [],
      }));

    const accommodations = db
      .prepare('SELECT * FROM accommodations WHERE trip_id = ? ORDER BY created_at ASC')
      .all(id)
      .map((a: any) => ({
        ...a,
        breakfast_included: Boolean(a.breakfast_included),
      }));

    const transportServices = db
      .prepare('SELECT * FROM transport_services WHERE trip_id = ? ORDER BY created_at ASC')
      .all(id);

    const bookings = db
      .prepare('SELECT * FROM bookings WHERE trip_id = ? ORDER BY created_at ASC')
      .all(id);

    return {
      ...trip,
      is_deleted: Boolean(trip.is_deleted),
      bounding_box: trip.bounding_box ? JSON.parse(trip.bounding_box) : null,
      stages,
      days,
      subRoutes,
      pois,
      accommodations,
      transportServices,
      bookings,
    };
  });

  // Create new trip
  fastify.post('/', async (request, reply) => {
    const userId = (request.user as any).id;
    const parse = CreateTripSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatná data pro vytvoření cesty.', details: parse.error.issues });
    }

    const id = `trip_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const {
      title,
      motto,
      status,
      country_region,
      travelers_count,
      primary_transport,
      room_scenario,
      budget_currency,
      notes,
      startDate,
      endDate,
      routeUrl,
    } = parse.data;

    db.prepare(`
      INSERT INTO trips (
        id, owner_id, title, motto, status, country_region, travelers_count,
        primary_transport, room_scenario, budget_currency, notes,
        start_date, end_date, route_url, version, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
    `).run(
      id,
      userId,
      title,
      motto || null,
      status,
      country_region || null,
      travelers_count || 3,
      primary_transport || 'Soukromé auto s řidičem',
      room_scenario || '2+1',
      budget_currency || 'USD',
      notes || null,
      startDate || null,
      endDate || null,
      routeUrl || null,
      now,
      now
    );

    return {
      id,
      title,
      motto,
      status,
      country_region,
      travelers_count,
      primary_transport,
      room_scenario,
      budget_currency,
      notes,
      startDate,
      endDate,
      routeUrl,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
  });

  // AI Trip Proposal generator (Preview before creating)
  fastify.post('/ai-propose', async (request, reply) => {
    const { prompt } = request.body as { prompt: string };
    if (!prompt || !prompt.trim()) {
      return reply.status(400).send({ error: 'Zadejte prosím textový popis vaší cesty.' });
    }

    try {
      const proposal = await proposeTrip(prompt.trim());
      return proposal;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Generování návrhu se nezdařilo.', details: err.message });
    }
  });

  // Import route file (GPX, KML, JSON)
  fastify.post('/import', async (request, reply) => {
    const userId = (request.user as any).id;
    const { content, filename, createTrip = false } = request.body as {
      content: string;
      filename?: string;
      createTrip?: boolean;
    };

    if (!content || !content.trim()) {
      return reply.status(400).send({ error: 'Je vyžadován text nebo soubor trasy.' });
    }

    const safeFilename = filename || 'chatgpt-plan.json';

    try {
      const parsed = parseRouteFile(content, safeFilename);

      // If user only wanted a preview
      if (!createTrip) {
        return parsed;
      }

      // If user wants to save it as a trip directly
      const tripId = `trip_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO trips (
          id, owner_id, title, motto, status, country_region, travelers_count,
          primary_transport, room_scenario, budget_currency, notes,
          start_date, end_date, version, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'planning', ?, ?, ?, '2+1', 'USD', 'Importováno ze souboru ' || ?, ?, ?, 1, 0, ?, ?)
      `).run(
        tripId,
        userId,
        parsed.title || 'Moje nová cesta',
        parsed.motto || 'Importovaná trasa',
        parsed.country_region || null,
        parsed.travelers_count || 3,
        parsed.primary_transport || 'Auto',
        safeFilename,
        parsed.start_date || null,
        parsed.end_date || null,
        now,
        now
      );

      // Insert days
      const dayMap = new Map<number, string>();
      for (const d of parsed.days) {
        const dayId = `day_${crypto.randomUUID()}`;
        dayMap.set(d.day_number, dayId);

        db.prepare(`
          INSERT INTO days (
            id, trip_id, day_number, specific_date, title, notes,
            start_location, overnight_location, transit_time_est, distance_km, transport_mode,
            has_detail, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
        `).run(
          dayId,
          tripId,
          d.day_number,
          d.date || null,
          d.title,
          d.activities || null,
          d.start_location || null,
          d.overnight_location || null,
          d.transit_time_est || null,
          d.distance_km || 0,
          d.transport_mode || 'Auto',
          now,
          now
        );
      }

      const insertPoi = db.prepare(`
          INSERT INTO pois (
            id, trip_id, day_id, category_id, name, is_top, lat, lng,
            description, why_visit, recommended_duration, cost_est, cost_currency,
            cost_category, is_mandatory, is_enabled, data_origin,
            source_url, main_photo_url,
            time_mode, visit_status, sort_order, version, is_deleted, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, 0, ?, ?,
            ?, ?, ?, ?, 'USD',
            ?, ?, ?, ?,
            ?, ?,
            'none', 'unvisited', ?, 1, 0, ?, ?
          )
        `);

        parsed.pois.forEach((p, idx) => {
          const poiId = `poi_${crypto.randomUUID()}`;
          const dayId = p.day_number ? dayMap.get(p.day_number) : dayMap.get(1);

          const validCategories = new Set([
            'accommodation', 'food', 'bar', 'monument', 'view', 'nature', 'transport', 'other'
          ]);
          let cat = (p.category_id || 'other').toLowerCase();
          if (cat === 'sight') cat = 'monument';
          if (cat === 'hotel') cat = 'accommodation';
          if (cat === 'restaurant') cat = 'food';
          if (!validCategories.has(cat)) cat = 'other';

          insertPoi.run(
            poiId,
            tripId,
            dayId || null,
            cat,
            p.name || 'Bod zájmu',
            Number(p.lat) || 0,
            Number(p.lng) || 0,
            p.description || null,
            p.why_visit || null,
            p.recommended_duration || null,
            Number(p.cost_est) || 0,
            p.cost_category || 'activities',
            p.is_mandatory ? 1 : 0,
            p.is_enabled ? 1 : 0,
            p.data_origin || 'imported',
            p.source_url || p.booking_url || null,
            p.main_photo_url || null,
            idx + 1,
            now,
            now
          );
        });

      // Insert accommodations if parsed
      if (parsed.accommodations && parsed.accommodations.length > 0) {
        const insertAcc = db.prepare(`
          INSERT INTO accommodations (
            id, trip_id, day_id, hotel_name, location, lat, lng, booking_url,
            price_total, price_single, price_currency, rooms_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        parsed.accommodations.forEach((acc) => {
          const accId = `acc_${crypto.randomUUID()}`;
          const dayId = acc.day_number ? dayMap.get(acc.day_number) : dayMap.get(1);
          insertAcc.run(
            accId,
            tripId,
            dayId || null,
            acc.hotel_name,
            acc.location || null,
            acc.lat || null,
            acc.lng || null,
            acc.booking_url || null,
            acc.price_total || 0,
            acc.price_single || 0,
            acc.price_currency || 'USD',
            acc.rooms_count || 2,
            now,
            now
          );
        });
      }

      // Insert bookings if parsed
      if (parsed.bookings && parsed.bookings.length > 0) {
        const insertBkg = db.prepare(`
          INSERT INTO bookings (
            id, trip_id, type, title, provider, confirmation_number,
            booking_date, price, currency, status, document_url, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)
        `);

        parsed.bookings.forEach((b) => {
          const bkgId = `bkg_${crypto.randomUUID()}`;
          insertBkg.run(
            bkgId,
            tripId,
            b.type || 'other',
            b.title,
            b.provider || null,
            b.confirmation_number || null,
            b.booking_date || null,
            b.price || 0,
            b.currency || 'USD',
            b.document_url || null,
            b.notes || null,
            now,
            now
          );
        });
      }

      // Insert sub-route if coordinates exist
      if (parsed.coordinates && parsed.coordinates.length > 1) {
        const subRouteId = `sr_${crypto.randomUUID()}`;
        db.prepare(`
          INSERT INTO sub_routes (id, trip_id, title, coordinates, version)
          VALUES (?, ?, 'Hlavní trasa cesty', ?, 1)
        `).run(subRouteId, tripId, JSON.stringify(parsed.coordinates));
      }

      return { id: tripId, title: parsed.title, daysCount: parsed.days.length, poisCount: parsed.pois.length };
    } catch (err: any) {
      return reply.status(400).send({ error: 'Chyba při importu trasy.', details: err.message });
    }
  });

  // Replace existing trip route using ChatGPT / import content (Požadavek 2)
  fastify.post('/:id/replace-route', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const { content, filename = 'chatgpt-plan.json' } = request.body as {
      content: string;
      filename?: string;
    };

    if (!content || !content.trim()) {
      return reply.status(400).send({ error: 'Zadejte prosím text nebo kód trasy z ChatGPT.' });
    }

    const trip = db
      .prepare(`SELECT * FROM trips WHERE id = ? AND (owner_id = ? OR owner_id = 'usr_demo_001' OR id = 'trip_srilanka_2026')`)
      .get(id, userId) as any;

    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    try {
      const parsed = parseRouteFile(content, filename);
      const now = new Date().toISOString();

      db.exec('BEGIN');
      try {
        db.prepare(`
          UPDATE trips
          SET title = COALESCE(?, title),
              motto = COALESCE(?, motto),
              country_region = COALESCE(?, country_region),
              travelers_count = COALESCE(?, travelers_count),
              primary_transport = COALESCE(?, primary_transport),
              start_date = COALESCE(?, start_date),
              end_date = COALESCE(?, end_date),
              updated_at = ?
          WHERE id = ?
        `).run(
          parsed.title || null,
          parsed.motto || null,
          parsed.country_region || null,
          parsed.travelers_count || null,
          parsed.primary_transport || null,
          parsed.start_date || null,
          parsed.end_date || null,
          now,
          id
        );

        db.prepare('DELETE FROM sub_routes WHERE trip_id = ?').run(id);
        db.prepare('DELETE FROM pois WHERE trip_id = ?').run(id);
        db.prepare('DELETE FROM accommodations WHERE trip_id = ?').run(id);
        db.prepare('DELETE FROM days WHERE trip_id = ?').run(id);

        const dayMap = new Map<number, string>();
        for (const d of parsed.days) {
          const dayId = `day_${crypto.randomUUID()}`;
          dayMap.set(d.day_number, dayId);

          db.prepare(`
            INSERT INTO days (
              id, trip_id, day_number, specific_date, title, notes,
              start_location, overnight_location, transit_time_est, distance_km, transport_mode,
              has_detail, version, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
          `).run(
            dayId,
            id,
            d.day_number,
            d.date || null,
            d.title,
            d.activities || null,
            d.start_location || null,
            d.overnight_location || null,
            d.transit_time_est || null,
            d.distance_km || 0,
            d.transport_mode || 'Auto',
            now,
            now
          );
        }

        const insertPoi = db.prepare(`
          INSERT INTO pois (
            id, trip_id, day_id, category_id, name, lat, lng,
            description, why_visit, recommended_duration, cost_est, cost_currency, cost_category,
            source_url, main_photo_url,
            is_mandatory, is_enabled, data_origin, sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const validCategories = new Set([
          'accommodation', 'food', 'bar', 'monument', 'view', 'nature', 'transport', 'other'
        ]);

        parsed.pois.forEach((p, idx) => {
          const poiId = `poi_${crypto.randomUUID()}`;
          const dayId = p.day_number ? dayMap.get(p.day_number) : dayMap.get(1);

          let cat = (p.category_id || 'other').toLowerCase();
          if (cat === 'sight') cat = 'monument';
          if (cat === 'hotel') cat = 'accommodation';
          if (cat === 'restaurant') cat = 'food';
          if (!validCategories.has(cat)) cat = 'other';

          insertPoi.run(
            poiId,
            id,
            dayId || null,
            cat,
            p.name || 'Bod zájmu',
            Number(p.lat) || 0,
            Number(p.lng) || 0,
            p.description || null,
            p.why_visit || null,
            p.recommended_duration || null,
            Number(p.cost_est) || 0,
            p.cost_category || 'activities',
            p.source_url || p.booking_url || null,
            p.main_photo_url || null,
            p.is_mandatory ? 1 : 0,
            p.is_enabled ? 1 : 0,
            p.data_origin || 'imported',
            idx + 1,
            now,
            now
          );
        });

        // Insert accommodations if parsed
        if (parsed.accommodations && parsed.accommodations.length > 0) {
          const insertAcc = db.prepare(`
            INSERT INTO accommodations (
              id, trip_id, day_id, hotel_name, location, lat, lng, booking_url,
              price_total, price_single, price_currency, rooms_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          parsed.accommodations.forEach((acc) => {
            const accId = `acc_${crypto.randomUUID()}`;
            const dayId = acc.day_number ? dayMap.get(acc.day_number) : dayMap.get(1);
            insertAcc.run(
              accId,
              id,
              dayId || null,
              acc.hotel_name,
              acc.location || null,
              acc.lat || null,
              acc.lng || null,
              acc.booking_url || null,
              acc.price_total || 0,
              acc.price_single || 0,
              acc.price_currency || 'USD',
              acc.rooms_count || 2,
              now,
              now
            );
          });
        }

        // Insert bookings if parsed
        if (parsed.bookings && parsed.bookings.length > 0) {
          db.prepare('DELETE FROM bookings WHERE trip_id = ?').run(id);
          const insertBkg = db.prepare(`
            INSERT INTO bookings (
              id, trip_id, type, title, provider, confirmation_number,
              booking_date, price, currency, status, document_url, notes,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)
          `);

          parsed.bookings.forEach((b) => {
            const bkgId = `bkg_${crypto.randomUUID()}`;
            insertBkg.run(
              bkgId,
              id,
              b.type || 'other',
              b.title,
              b.provider || null,
              b.confirmation_number || null,
              b.booking_date || null,
              b.price || 0,
              b.currency || 'USD',
              b.document_url || null,
              b.notes || null,
              now,
              now
            );
          });
        }

        if (parsed.coordinates && parsed.coordinates.length > 1) {
          const subRouteId = `sr_${crypto.randomUUID()}`;
          db.prepare(`
            INSERT INTO sub_routes (id, trip_id, title, coordinates, version)
            VALUES (?, ?, 'Hlavní trasa cesty', ?, 1)
          `).run(subRouteId, id, JSON.stringify(parsed.coordinates));
        }

        db.exec('COMMIT');
      } catch (transErr) {
        db.exec('ROLLBACK');
        throw transErr;
      }

      return {
        success: true,
        id,
        title: parsed.title || trip.title,
        daysCount: parsed.days.length,
        poisCount: parsed.pois.length,
      };
    } catch (err: any) {
      return reply.status(400).send({ error: 'Chyba při aktualizaci trasy z ChatGPT.', details: err.message });
    }
  });

  // Optimize route (suggest improvements)
  fastify.post('/:id/optimize-route', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const trip = db
      .prepare(`SELECT * FROM trips WHERE id = ? AND (owner_id = ? OR owner_id = 'usr_demo_001' OR id = 'trip_srilanka_2026')`)
      .get(id, userId) as any;

    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const pois = db.prepare('SELECT * FROM pois WHERE trip_id = ? AND is_deleted = 0').all(id);
    const optimization = optimizeRoute(trip.title, pois);
    return optimization;
  });

  // Switch room scenario ('2+1' vs 'triple')
  fastify.put('/:id/room-scenario', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const { room_scenario } = request.body as { room_scenario: '2+1' | 'triple' };

    if (!room_scenario || (room_scenario !== '2+1' && room_scenario !== 'triple')) {
      return reply.status(400).send({ error: 'Neplatný scénář pokojů. Povolené hodnoty: 2+1 nebo triple.' });
    }

    db.prepare(`UPDATE trips SET room_scenario = ?, updated_at = ? WHERE id = ? AND (owner_id = ? OR owner_id = 'usr_demo_001' OR id = 'trip_srilanka_2026')`).run(
      room_scenario,
      new Date().toISOString(),
      id,
      userId
    );

    return { success: true, room_scenario };
  });

  // Toggle optional activity / POI enabled state
  fastify.put('/:id/pois/:poiId/toggle-enabled', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id, poiId } = request.params as { id: string; poiId: string };
    const { is_enabled } = request.body as { is_enabled?: boolean };

    const poi = db
      .prepare('SELECT id, is_enabled FROM pois WHERE id = ? AND trip_id = ?')
      .get(poiId, id) as any;

    if (!poi) {
      return reply.status(404).send({ error: 'Místo nebylo nalezeno.' });
    }

    const newEnabled = is_enabled !== undefined ? (is_enabled ? 1 : 0) : poi.is_enabled ? 0 : 1;
    db.prepare('UPDATE pois SET is_enabled = ?, updated_at = ? WHERE id = ?').run(
      newEnabled,
      new Date().toISOString(),
      poiId
    );

    return { success: true, poiId, is_enabled: Boolean(newEnabled) };
  });

  // Drag & drop reorder POIs
  fastify.post('/:id/reorder-pois', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const { pois } = request.body as { pois: { id: string; sort_order: number; day_id?: string }[] };

    if (!Array.isArray(pois)) {
      return reply.status(400).send({ error: 'Neplatný formát dat pro přeřazení bodů.' });
    }

    const updateStmt = db.prepare('UPDATE pois SET sort_order = ?, day_id = COALESCE(?, day_id), updated_at = ? WHERE id = ? AND trip_id = ?');
    const now = new Date().toISOString();

    for (const p of pois) {
      updateStmt.run(p.sort_order, p.day_id || null, now, p.id, id);
    }

    return { success: true, count: pois.length };
  });

  // Update trip metadata
  fastify.put('/:id', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const parse = UpdateTripSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({ error: 'Neplatná data pro aktualizaci.', details: parse.error.issues });
    }

    const existing = db.prepare(`SELECT * FROM trips WHERE id = ? AND (owner_id = ? OR owner_id = 'usr_demo_001' OR id = 'trip_srilanka_2026')`).get(id, userId);
    if (!existing) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const now = new Date().toISOString();
    const data = parse.data;

    const fields: string[] = ['updated_at = ?', 'version = version + 1'];
    const values: any[] = [now];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.motto !== undefined) { fields.push('motto = ?'); values.push(data.motto); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.country_region !== undefined) { fields.push('country_region = ?'); values.push(data.country_region); }
    if (data.travelers_count !== undefined) { fields.push('travelers_count = ?'); values.push(data.travelers_count); }
    if (data.primary_transport !== undefined) { fields.push('primary_transport = ?'); values.push(data.primary_transport); }
    if (data.room_scenario !== undefined) { fields.push('room_scenario = ?'); values.push(data.room_scenario); }
    if (data.budget_currency !== undefined) { fields.push('budget_currency = ?'); values.push(data.budget_currency); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
    if (data.startDate !== undefined) { fields.push('start_date = ?'); values.push(data.startDate); }
    if (data.endDate !== undefined) { fields.push('end_date = ?'); values.push(data.endDate); }
    if (data.routeUrl !== undefined) { fields.push('route_url = ?'); values.push(data.routeUrl); }

    values.push(id);
    db.prepare(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return { id, success: true, updatedAt: now };
  });

  // Soft delete trip
  fastify.delete('/:id', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const trip = db.prepare(`SELECT id FROM trips WHERE id = ? AND (owner_id = ? OR owner_id = 'usr_demo_001' OR id = 'trip_srilanka_2026')`).get(id, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE trips SET is_deleted = 1, updated_at = ? WHERE id = ?').run(now, id);
    return { success: true, id };
  });

  // Create stage in trip
  fastify.post('/:id/stages', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const { title, notes, hasDetail = false } = request.body as { title: string; notes?: string; hasDetail?: boolean };

    if (!title || !title.trim()) {
      return reply.status(400).send({ error: 'Název etapy je povinný.' });
    }

    const trip = db.prepare(`SELECT id FROM trips WHERE id = ? AND (owner_id = ? OR owner_id = 'usr_demo_001' OR id = 'trip_srilanka_2026')`).get(id, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    const maxOrder = (
      db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM stages WHERE trip_id = ?').get(id) as any
    ).max_order;

    const stageId = `stg_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO stages (id, trip_id, title, notes, sort_order, has_detail, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(stageId, id, title.trim(), notes || null, maxOrder + 1, hasDetail ? 1 : 0, now, now);

    return { id: stageId, tripId: id, title: title.trim(), notes, sortOrder: maxOrder + 1, hasDetail };
  });

  // Delete stage
  fastify.delete('/:id/stages/:stageId', async (request, reply) => {
    const userId = (request.user as any).id;
    const { id, stageId } = request.params as { id: string; stageId: string };

    const trip = db.prepare(`SELECT id FROM trips WHERE id = ? AND (owner_id = ? OR owner_id = 'usr_demo_001' OR id = 'trip_srilanka_2026')`).get(id, userId);
    if (!trip) {
      return reply.status(404).send({ error: 'Cesta nebyla nalezena.' });
    }

    db.prepare('UPDATE pois SET stage_id = NULL WHERE stage_id = ? AND trip_id = ?').run(stageId, id);
    db.prepare('DELETE FROM stages WHERE id = ? AND trip_id = ?').run(stageId, id);

    return { success: true, stageId };
  });
};
