import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import crypto from 'crypto';

export const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all bookings for trip
  fastify.get<{
    Params: { tripId: string };
  }>('/:tripId/bookings', async (request, reply) => {
    const { tripId } = request.params;
    const bookings = db
      .prepare('SELECT * FROM bookings WHERE trip_id = ? ORDER BY created_at ASC')
      .all(tripId);
    return bookings;
  });

  // Create booking
  fastify.post<{
    Params: { tripId: string };
    Body: {
      type: string;
      title: string;
      provider?: string;
      confirmation_number?: string;
      booking_date?: string;
      start_datetime?: string;
      end_datetime?: string;
      price?: number;
      currency?: string;
      status?: string;
      contact_phone?: string;
      contact_email?: string;
      document_url?: string;
      notes?: string;
    };
  }>('/:tripId/bookings', async (request, reply) => {
    const { tripId } = request.params;
    const body = request.body;

    if (!body.title || !body.title.trim()) {
      return reply.status(400).send({ error: 'Název rezervace je povinný.' });
    }

    const id = `bkg_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO bookings (
        id, trip_id, type, title, provider, confirmation_number, booking_date,
        start_datetime, end_datetime, price, currency, status,
        contact_phone, contact_email, document_url, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tripId,
      body.type || 'other',
      body.title.trim(),
      body.provider || null,
      body.confirmation_number || null,
      body.booking_date || null,
      body.start_datetime || null,
      body.end_datetime || null,
      body.price || 0,
      body.currency || 'USD',
      body.status || 'confirmed',
      body.contact_phone || null,
      body.contact_email || null,
      body.document_url || null,
      body.notes || null,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return created;
  });

  // Update booking
  fastify.put<{
    Params: { tripId: string; id: string };
    Body: {
      type?: string;
      title?: string;
      provider?: string;
      confirmation_number?: string;
      booking_date?: string;
      start_datetime?: string;
      end_datetime?: string;
      price?: number;
      currency?: string;
      status?: string;
      contact_phone?: string;
      contact_email?: string;
      document_url?: string;
      notes?: string;
    };
  }>('/:tripId/bookings/:id', async (request, reply) => {
    const { tripId, id } = request.params;
    const body = request.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ? AND trip_id = ?').get(id, tripId);
    if (!existing) {
      return reply.status(404).send({ error: 'Rezervace nebyla nalezena.' });
    }

    db.prepare(`
      UPDATE bookings SET
        type = COALESCE(?, type),
        title = COALESCE(?, title),
        provider = COALESCE(?, provider),
        confirmation_number = COALESCE(?, confirmation_number),
        booking_date = COALESCE(?, booking_date),
        start_datetime = COALESCE(?, start_datetime),
        end_datetime = COALESCE(?, end_datetime),
        price = COALESCE(?, price),
        currency = COALESCE(?, currency),
        status = COALESCE(?, status),
        contact_phone = COALESCE(?, contact_phone),
        contact_email = COALESCE(?, contact_email),
        document_url = COALESCE(?, document_url),
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ? AND trip_id = ?
    `).run(
      body.type !== undefined ? body.type : null,
      body.title !== undefined ? body.title.trim() : null,
      body.provider !== undefined ? body.provider : null,
      body.confirmation_number !== undefined ? body.confirmation_number : null,
      body.booking_date !== undefined ? body.booking_date : null,
      body.start_datetime !== undefined ? body.start_datetime : null,
      body.end_datetime !== undefined ? body.end_datetime : null,
      body.price !== undefined ? body.price : null,
      body.currency !== undefined ? body.currency : null,
      body.status !== undefined ? body.status : null,
      body.contact_phone !== undefined ? body.contact_phone : null,
      body.contact_email !== undefined ? body.contact_email : null,
      body.document_url !== undefined ? body.document_url : null,
      body.notes !== undefined ? body.notes : null,
      now,
      id,
      tripId
    );

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return updated;
  });

  // Delete booking
  fastify.delete<{
    Params: { tripId: string; id: string };
  }>('/:tripId/bookings/:id', async (request, reply) => {
    const { tripId, id } = request.params;
    db.prepare('DELETE FROM bookings WHERE id = ? AND trip_id = ?').run(id, tripId);
    return { success: true };
  });
};
