import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { SyncMutation } from '../types.js';

export const syncRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate);

  // Batch sync outbox from offline client
  fastify.post('/batch', async (request, reply) => {
    const userId = (request.user as any).id;
    const { mutations } = request.body as { mutations: SyncMutation[] };

    if (!Array.isArray(mutations)) {
      return reply.status(400).send({ error: 'mutations musí být pole synchronizačních operací.' });
    }

    const results: { id: string; status: 'applied' | 'conflict_resolved' | 'error'; newVersion?: number; error?: string }[] = [];

    // Process mutations inside a transaction
    db.exec('BEGIN TRANSACTION;');

    try {
      for (const m of mutations) {
        if (m.entity === 'poi') {
          const poi = db
            .prepare(`
              SELECT p.*, t.owner_id 
              FROM pois p 
              JOIN trips t ON p.trip_id = t.id 
              WHERE p.id = ?
            `)
            .get(m.entity_id) as any;

          if (m.action === 'UPSERT') {
            const p = m.payload;
            if (!poi) {
              // Creating new POI offline
              const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND owner_id = ?').get(p.trip_id, userId);
              if (!trip) {
                results.push({ id: m.id, status: 'error', error: 'Cesta neexistuje nebo nemáte práva.' });
                continue;
              }

              const now = new Date().toISOString();
              db.prepare(`
                INSERT INTO pois (
                  id, trip_id, stage_id, day_id, sub_route_id, category_id, name, is_top, lat, lng,
                  address, description, private_notes, opening_hours, source_url, external_links,
                  time_mode, target_time, visit_status, main_photo_url, sort_order, version,
                  is_deleted, created_at, updated_at
                ) VALUES (
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                  ?, ?, ?, ?, ?, ?,
                  ?, ?, ?, ?, ?, 1, 0, ?, ?
                )
              `).run(
                m.entity_id,
                p.trip_id,
                p.stage_id || null,
                p.day_id || null,
                p.sub_route_id || null,
                p.category_id,
                p.name,
                p.is_top ? 1 : 0,
                p.lat,
                p.lng,
                p.address || null,
                p.description || null,
                p.private_notes || null,
                p.opening_hours || null,
                p.source_url || null,
                p.external_links ? JSON.stringify(p.external_links) : null,
                p.time_mode || 'none',
                p.target_time || null,
                p.visit_status || 'unvisited',
                p.main_photo_url || null,
                p.sort_order || 1,
                now,
                now
              );

              results.push({ id: m.id, status: 'applied', newVersion: 1 });
            } else {
              // Updating existing POI
              if (poi.owner_id !== userId) {
                results.push({ id: m.id, status: 'error', error: 'Nemáte oprávnění upravit tento bod.' });
                continue;
              }

              // Check timestamps / version (LWW)
              const clientTime = new Date(m.client_timestamp).getTime();
              const serverTime = new Date(poi.updated_at).getTime();

              if (clientTime >= serverTime || m.client_version >= poi.version) {
                const now = new Date().toISOString();
                const newVersion = poi.version + 1;

                db.prepare(`
                  UPDATE pois SET
                    name = COALESCE(?, name),
                    is_top = CASE WHEN ? IS NOT NULL THEN ? ELSE is_top END,
                    description = CASE WHEN ? IS NOT NULL THEN ? ELSE description END,
                    private_notes = CASE WHEN ? IS NOT NULL THEN ? ELSE private_notes END,
                    visit_status = COALESCE(?, visit_status),
                    version = ?,
                    updated_at = ?
                  WHERE id = ?
                `).run(
                  p.name || null,
                  p.is_top !== undefined ? (p.is_top ? 1 : 0) : null,
                  p.is_top ? 1 : 0,
                  p.description !== undefined ? p.description : null,
                  p.description || null,
                  p.private_notes !== undefined ? p.private_notes : null,
                  p.private_notes || null,
                  p.visit_status || null,
                  newVersion,
                  now,
                  m.entity_id
                );

                results.push({ id: m.id, status: 'applied', newVersion });
              } else {
                // Server has newer data, retain server version (conflict resolution)
                results.push({ id: m.id, status: 'conflict_resolved', newVersion: poi.version });
              }
            }
          } else if (m.action === 'DELETE') {
            if (poi && poi.owner_id === userId) {
              const now = new Date().toISOString();
              db.prepare('UPDATE pois SET is_deleted = 1, updated_at = ? WHERE id = ?').run(now, m.entity_id);
              results.push({ id: m.id, status: 'applied' });
            } else {
              results.push({ id: m.id, status: 'error', error: 'Bod neexistuje nebo nemáte práva.' });
            }
          }
        }
      }

      db.exec('COMMIT;');
      return { success: true, results };
    } catch (err: any) {
      db.exec('ROLLBACK;');
      return reply.status(500).send({ error: 'Chyba během dávkové synchronizace.', message: err.message });
    }
  });
};
