import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import crypto from 'crypto';

export const accommodationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Create accommodation
  fastify.post<{
    Params: { tripId: string };
    Body: {
      day_id?: string;
      hotel_name: string;
      location?: string;
      lat?: number;
      lng?: number;
      booking_url?: string;
      price_total?: number;
      price_single?: number;
      price_currency?: string;
      rooms_count?: number;
      room_type?: string;
      breakfast_included?: boolean;
      cancellation_policy?: string;
      booking_status?: string;
      booking_reference?: string;
      notes?: string;
    };
  }>('/:tripId/accommodations', async (request, reply) => {
    const { tripId } = request.params;
    const body = request.body;

    if (!body.hotel_name || !body.hotel_name.trim()) {
      return reply.status(400).send({ error: 'Název ubytování je povinný.' });
    }

    const id = `acc_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO accommodations (
        id, trip_id, day_id, hotel_name, location, lat, lng, booking_url,
        price_total, price_single, price_currency, rooms_count, room_type,
        breakfast_included, cancellation_policy, booking_status, booking_reference, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tripId,
      body.day_id || null,
      body.hotel_name.trim(),
      body.location || null,
      body.lat || null,
      body.lng || null,
      body.booking_url || null,
      body.price_total || 0,
      body.price_single || 0,
      body.price_currency || 'USD',
      body.rooms_count || 2,
      body.room_type || null,
      body.breakfast_included ? 1 : 0,
      body.cancellation_policy || null,
      body.booking_status || 'confirmed',
      body.booking_reference || null,
      body.notes || null,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM accommodations WHERE id = ?').get(id) as any;
    return { ...created, breakfast_included: Boolean(created.breakfast_included) };
  });

  // Update accommodation
  fastify.put<{
    Params: { tripId: string; id: string };
    Body: {
      day_id?: string;
      hotel_name?: string;
      location?: string;
      lat?: number;
      lng?: number;
      booking_url?: string;
      price_total?: number;
      price_single?: number;
      price_currency?: string;
      rooms_count?: number;
      room_type?: string;
      breakfast_included?: boolean;
      cancellation_policy?: string;
      booking_status?: string;
      booking_reference?: string;
      notes?: string;
    };
  }>('/:tripId/accommodations/:id', async (request, reply) => {
    const { tripId, id } = request.params;
    const body = request.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM accommodations WHERE id = ? AND trip_id = ?').get(id, tripId);
    if (!existing) {
      return reply.status(404).send({ error: 'Ubytování nebylo nalezeno.' });
    }

    db.prepare(`
      UPDATE accommodations SET
        day_id = COALESCE(?, day_id),
        hotel_name = COALESCE(?, hotel_name),
        location = COALESCE(?, location),
        lat = COALESCE(?, lat),
        lng = COALESCE(?, lng),
        booking_url = COALESCE(?, booking_url),
        price_total = COALESCE(?, price_total),
        price_single = COALESCE(?, price_single),
        price_currency = COALESCE(?, price_currency),
        rooms_count = COALESCE(?, rooms_count),
        room_type = COALESCE(?, room_type),
        breakfast_included = CASE WHEN ? IS NOT NULL THEN ? ELSE breakfast_included END,
        cancellation_policy = COALESCE(?, cancellation_policy),
        booking_status = COALESCE(?, booking_status),
        booking_reference = COALESCE(?, booking_reference),
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ? AND trip_id = ?
    `).run(
      body.day_id !== undefined ? body.day_id : null,
      body.hotel_name !== undefined ? body.hotel_name.trim() : null,
      body.location !== undefined ? body.location : null,
      body.lat !== undefined ? body.lat : null,
      body.lng !== undefined ? body.lng : null,
      body.booking_url !== undefined ? body.booking_url : null,
      body.price_total !== undefined ? body.price_total : null,
      body.price_single !== undefined ? body.price_single : null,
      body.price_currency !== undefined ? body.price_currency : null,
      body.rooms_count !== undefined ? body.rooms_count : null,
      body.room_type !== undefined ? body.room_type : null,
      body.breakfast_included !== undefined ? 1 : null,
      body.breakfast_included ? 1 : 0,
      body.cancellation_policy !== undefined ? body.cancellation_policy : null,
      body.booking_status !== undefined ? body.booking_status : null,
      body.booking_reference !== undefined ? body.booking_reference : null,
      body.notes !== undefined ? body.notes : null,
      now,
      id,
      tripId
    );

    const updated = db.prepare('SELECT * FROM accommodations WHERE id = ?').get(id) as any;
    return { ...updated, breakfast_included: Boolean(updated.breakfast_included) };
  });

  // Delete accommodation
  fastify.delete<{
    Params: { tripId: string; id: string };
  }>('/:tripId/accommodations/:id', async (request, reply) => {
    const { tripId, id } = request.params;
    db.prepare('DELETE FROM accommodations WHERE id = ? AND trip_id = ?').run(id, tripId);
    return { success: true };
  });
};
