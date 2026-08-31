import { FullTrip, POI, Trip, Category, SyncMutation, Tip, Accommodation, Booking, Reminder } from '../types';
import { offlineDb } from '../offline/db';

const API_BASE = '/api';

function getAuthToken(): string | null {
  return localStorage.getItem('taktudy_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('taktudy_token', token);
  } else {
    localStorage.removeItem('taktudy_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type to application/json if there is actually a body to prevent Fastify 400 on empty DELETE/GET
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Chyba požadavku: HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    return res;
  },
  register: async (email: string, password: string, displayName: string) => {
    const res = await request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    setAuthToken(res.token);
    return res;
  },
  me: async () => {
    return request<any>('/auth/me');
  },
  logout: () => {
    setAuthToken(null);
  },
};

// Trips API
export const tripsApi = {
  list: async (): Promise<Trip[]> => {
    try {
      const serverTrips = await request<Trip[]>('/trips');
      const serverTripIds = new Set(serverTrips.map((t) => t.id));

      // Check if user has trips in local IndexedDB that are missing on the server (e.g. after Render restart/deploy)
      const localCachedTrips = await offlineDb.cachedTrips.toArray();
      const missingOnServer = localCachedTrips.filter(
        (lt) => !serverTripIds.has(lt.id) && !lt.is_deleted
      );

      for (const localTrip of missingOnServer) {
        try {
          const localPois = await offlineDb.cachedPois.where('trip_id').equals(localTrip.id).toArray();
          await request('/trips/restore-full', {
            method: 'POST',
            body: JSON.stringify({
              trip: localTrip,
              pois: localPois,
              days: (localTrip as any).days || [],
              accommodations: (localTrip as any).accommodations || [],
              bookings: (localTrip as any).bookings || [],
            }),
          });
          serverTrips.push(localTrip);
          serverTripIds.add(localTrip.id);
        } catch (restoreErr) {
          console.warn('Automatická obnova trasy na server selhala:', restoreErr);
          serverTrips.push(localTrip);
        }
      }

      // Keep local IndexedDB in sync without destructive wipe
      if (serverTrips.length > 0) {
        await offlineDb.cachedTrips.bulkPut(serverTrips);
      }
      return serverTrips;
    } catch (err) {
      // Offline fallback: return all non-deleted cached trips
      const cached = await offlineDb.cachedTrips.toArray();
      if (cached.length > 0) return cached.filter((t) => !t.is_deleted);
      throw err;
    }
  },

  get: async (id: string): Promise<FullTrip> => {
    try {
      const trip = await request<FullTrip>(`/trips/${id}`);
      // Cache locally
      await offlineDb.cachedTrips.put(trip);
      await offlineDb.cachedPois.bulkPut(trip.pois);
      return trip;
    } catch (err) {
      // Offline fallback
      const cachedTrip = await offlineDb.cachedTrips.get(id);
      if (cachedTrip) {
        const cachedPois = await offlineDb.cachedPois.where('trip_id').equals(id).toArray();
        return {
          ...cachedTrip,
          stages: (cachedTrip as any).stages || [],
          days: (cachedTrip as any).days || [],
          subRoutes: (cachedTrip as any).subRoutes || [],
          accommodations: (cachedTrip as any).accommodations || [],
          bookings: (cachedTrip as any).bookings || [],
          pois: cachedPois.length > 0 ? cachedPois : (cachedTrip as any).pois || [],
        } as FullTrip;
      }
      throw err;
    }
  },

  create: async (data: { title: string; motto?: string; status?: string; startDate?: string; endDate?: string; routeUrl?: string }): Promise<Trip> => {
    const created = await request<Trip>('/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await offlineDb.cachedTrips.put(created);
    return created;
  },

  update: async (id: string, data: Partial<Trip>): Promise<any> => {
    return request(`/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getAll: async (): Promise<Trip[]> => {
    return tripsApi.list();
  },

  delete: async (id: string): Promise<any> => {
    await offlineDb.cachedTrips.delete(id);
    await offlineDb.cachedPois.where('trip_id').equals(id).delete();
    try {
      return await request(`/trips/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      if (err.message?.includes('Too Many Requests') || err.message?.includes('429') || err.message?.includes('404')) {
        return { success: true, id };
      }
      throw err;
    }
  },

  clearAll: async (): Promise<any> => {
    await offlineDb.cachedTrips.clear();
    await offlineDb.cachedPois.clear();
    await offlineDb.outboxMutations.clear();
    try {
      localStorage.removeItem('taktudy_active_trip_id');
    } catch {}
    try {
      return await request('/trips/clear-all', { method: 'POST' });
    } catch (err: any) {
      console.warn('Server clearAll warning:', err);
      return { success: true };
    }
  },

  duplicate: async (id: string): Promise<any> => {
    return request(`/trips/${id}/duplicate`, { method: 'POST' });
  },

  addStage: async (tripId: string, data: { title: string; notes?: string }): Promise<any> => {
    return request(`/trips/${tripId}/stages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteStage: async (tripId: string, stageId: string): Promise<any> => {
    return request(`/trips/${tripId}/stages/${stageId}`, { method: 'DELETE' });
  },

  addDay: async (
    tripId: string,
    data: {
      title: string;
      notes?: string;
      specific_date?: string;
      start_location?: string;
      overnight_location?: string;
      distance_km?: number;
      transport_mode?: string;
      transit_time_est?: string;
    }
  ): Promise<any> => {
    return request(`/trips/${tripId}/days`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteDay: async (tripId: string, dayId: string): Promise<any> => {
    return request(`/trips/${tripId}/days/${dayId}`, { method: 'DELETE' });
  },

  aiPropose: async (prompt: string): Promise<any> => {
    return request('/trips/ai-propose', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  importRoute: async (content: string, filename: string, createTrip: boolean = false): Promise<any> => {
    return request('/trips/import', {
      method: 'POST',
      body: JSON.stringify({ content, filename, createTrip }),
    });
  },

  optimizeRoute: async (tripId: string): Promise<any> => {
    return request(`/trips/${tripId}/optimize-route`, {
      method: 'POST',
    });
  },

  setRoomScenario: async (tripId: string, roomScenario: '2+1' | 'triple'): Promise<any> => {
    return request(`/trips/${tripId}/room-scenario`, {
      method: 'PUT',
      body: JSON.stringify({ room_scenario: roomScenario }),
    });
  },

  togglePoiEnabled: async (tripId: string, poiId: string, is_enabled?: boolean): Promise<any> => {
    return request(`/trips/${tripId}/pois/${poiId}/toggle-enabled`, {
      method: 'PUT',
      body: JSON.stringify({ is_enabled }),
    });
  },

  reorderPois: async (tripId: string, pois: { id: string; sort_order: number; day_id?: string }[]): Promise<any> => {
    return request(`/trips/${tripId}/reorder-pois`, {
      method: 'POST',
      body: JSON.stringify({ pois }),
    });
  },

  replaceRoute: async (tripId: string, content: string, filename: string = 'chatgpt-plan.json'): Promise<any> => {
    return request(`/trips/${tripId}/replace-route`, {
      method: 'POST',
      body: JSON.stringify({ content, filename }),
    });
  },
};

// Tips / Wishlist API
export const tipsApi = {
  getAll: async (tripId?: string): Promise<Tip[]> => {
    const query = tripId ? `?trip_id=${encodeURIComponent(tripId)}` : '';
    return request<Tip[]>(`/tips${query}`);
  },

  create: async (data: Partial<Tip>): Promise<Tip> => {
    return request<Tip>('/tips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Tip>): Promise<Tip> => {
    return request<Tip>(`/tips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<any> => {
    return request(`/tips/${id}`, { method: 'DELETE' });
  },

  clearAll: async (): Promise<any> => {
    return request('/tips/clear-all', { method: 'POST' });
  },

  promoteToPoi: async (id: string, payload: { tripId: string; dayId: string }): Promise<any> => {
    return request(`/tips/${id}/promote-to-poi`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// Accommodations API
export const accommodationsApi = {
  create: async (tripId: string, data: Partial<Accommodation>): Promise<Accommodation> => {
    return request<Accommodation>(`/trips/${tripId}/accommodations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (tripId: string, id: string, data: Partial<Accommodation>): Promise<Accommodation> => {
    return request<Accommodation>(`/trips/${tripId}/accommodations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (tripId: string, id: string): Promise<any> => {
    return request(`/trips/${tripId}/accommodations/${id}`, {
      method: 'DELETE',
    });
  },
};

// Bookings API
export const bookingsApi = {
  getAll: async (tripId: string): Promise<Booking[]> => {
    return request<Booking[]>(`/trips/${tripId}/bookings`);
  },

  create: async (tripId: string, data: Partial<Booking>): Promise<Booking> => {
    return request<Booking>(`/trips/${tripId}/bookings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (tripId: string, id: string, data: Partial<Booking>): Promise<Booking> => {
    return request<Booking>(`/trips/${tripId}/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (tripId: string, id: string): Promise<any> => {
    return request(`/trips/${tripId}/bookings/${id}`, {
      method: 'DELETE',
    });
  },
};

// Reminders API (Route-specific reminders for restaurant reservations, tickets, transport, etc.)
export const remindersApi = {
  getAll: async (tripId: string): Promise<Reminder[]> => {
    return request<Reminder[]>(`/trips/${tripId}/reminders`);
  },

  create: async (tripId: string, data: Partial<Reminder>): Promise<Reminder> => {
    return request<Reminder>(`/trips/${tripId}/reminders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (tripId: string, id: string, data: Partial<Reminder>): Promise<Reminder> => {
    return request<Reminder>(`/trips/${tripId}/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  toggle: async (tripId: string, id: string): Promise<Reminder> => {
    return request<Reminder>(`/trips/${tripId}/reminders/${id}/toggle`, {
      method: 'POST',
    });
  },

  delete: async (tripId: string, id: string): Promise<any> => {
    return request(`/trips/${tripId}/reminders/${id}`, {
      method: 'DELETE',
    });
  },
};

// POI API
export const poiApi = {
  create: async (tripId: string, poiData: Partial<POI>): Promise<POI> => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      // Offline creation: generate local ID and queue mutation
      const localId = `poi_offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newPoi: POI = {
        id: localId,
        trip_id: tripId,
        stage_id: poiData.stage_id || null,
        day_id: poiData.day_id || null,
        category_id: poiData.category_id || 'other',
        name: poiData.name || 'Nový bod',
        is_top: Boolean(poiData.is_top),
        lat: poiData.lat || 0,
        lng: poiData.lng || 0,
        address: poiData.address || null,
        description: poiData.description || null,
        private_notes: poiData.private_notes || null,
        opening_hours: poiData.opening_hours || null,
        source_url: poiData.source_url || null,
        time_mode: poiData.time_mode || 'none',
        target_time: poiData.target_time || null,
        visit_status: poiData.visit_status || 'unvisited',
        main_photo_url: poiData.main_photo_url || null,
        sort_order: 999,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await offlineDb.cachedPois.put(newPoi);
      await offlineDb.outboxMutations.put({
        id: `mut_${Date.now()}`,
        entity: 'poi',
        entity_id: localId,
        action: 'UPSERT',
        payload: newPoi,
        client_timestamp: new Date().toISOString(),
        client_version: 1,
      });

      return newPoi;
    }

    const created = await request<POI>(`/trips/${tripId}/pois`, {
      method: 'POST',
      body: JSON.stringify(poiData),
    });
    await offlineDb.cachedPois.put(created);
    return created;
  },

  update: async (tripId: string, id: string, poiData: Partial<POI>): Promise<any> => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      const existing = await offlineDb.cachedPois.get(id);
      const updated = { ...existing, ...poiData, updated_at: new Date().toISOString() } as POI;
      await offlineDb.cachedPois.put(updated);
      await offlineDb.outboxMutations.put({
        id: `mut_${Date.now()}`,
        entity: 'poi',
        entity_id: id,
        action: 'UPSERT',
        payload: poiData,
        client_timestamp: new Date().toISOString(),
        client_version: (existing?.version || 1) + 1,
      });
      return { id, status: 'queued_offline' };
    }

    const res = await request(`/trips/${tripId}/pois/${id}`, {
      method: 'PUT',
      body: JSON.stringify(poiData),
    });
    const cached = await offlineDb.cachedPois.get(id);
    if (cached) {
      await offlineDb.cachedPois.put({ ...cached, ...poiData });
    }
    return res;
  },

  toggleTop: async (tripId: string, id: string): Promise<{ id: string; isTop: boolean }> => {
    return request(`/trips/${tripId}/pois/${id}/top`, { method: 'PATCH' });
  },

  updateVisitStatus: async (tripId: string, id: string, status: 'unvisited' | 'visited' | 'skipped'): Promise<any> => {
    return request(`/trips/${tripId}/pois/${id}/visit`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  reorder: async (tripId: string, orderedIds: string[]): Promise<any> => {
    return request(`/trips/${tripId}/pois/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    });
  },

  delete: async (tripId: string, id: string): Promise<any> => {
    await offlineDb.cachedPois.delete(id);
    return request(`/trips/${tripId}/pois/${id}`, { method: 'DELETE' });
  },
};

// Categories API
export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    return request<Category[]>('/categories');
  },
};

// Share API
export const shareApi = {
  generate: async (tripId: string, includeNotes = true): Promise<{ token: string; includeNotes: boolean }> => {
    return request('/share/generate', {
      method: 'POST',
      body: JSON.stringify({ tripId, includeNotes }),
    });
  },
  revoke: async (tripId: string): Promise<any> => {
    return request('/share/revoke', {
      method: 'POST',
      body: JSON.stringify({ tripId }),
    });
  },
  getSharedTrip: async (token: string): Promise<FullTrip> => {
    return request<FullTrip>(`/share/${token}`);
  },
};

// Import URL API
export const importApi = {
  fetchUrlMetadata: async (url: string) => {
    return request<any>('/import/url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },
};

// Sync API
export const syncApi = {
  processOutbox: async (): Promise<{ appliedCount: number; errors: any[] }> => {
    const mutations = await offlineDb.outboxMutations.toArray();
    if (mutations.length === 0) return { appliedCount: 0, errors: [] };

    try {
      const res = await request<{ success: boolean; results: any[] }>('/sync/batch', {
        method: 'POST',
        body: JSON.stringify({ mutations }),
      });

      const appliedIds: string[] = [];
      const errors: any[] = [];

      for (const r of res.results) {
        if (r.status === 'applied' || r.status === 'conflict_resolved') {
          appliedIds.push(r.id);
        } else {
          errors.push(r);
        }
      }

      await offlineDb.outboxMutations.bulkDelete(appliedIds);
      return { appliedCount: appliedIds.length, errors };
    } catch (err: any) {
      return { appliedCount: 0, errors: [err.message] };
    }
  },
};
