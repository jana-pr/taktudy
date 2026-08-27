import { FullTrip, POI, Trip, Category, SyncMutation } from '../types';
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
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
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
      const trips = await request<Trip[]>('/trips');
      // Cache trips locally
      await offlineDb.cachedTrips.bulkPut(trips);
      return trips;
    } catch (err) {
      // Fallback to offline store
      const cached = await offlineDb.cachedTrips.toArray();
      if (cached.length > 0) return cached;
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
          stages: [],
          days: [],
          subRoutes: [],
          pois: cachedPois,
        } as FullTrip;
      }
      throw err;
    }
  },

  create: async (data: { title: string; motto?: string; status?: string; startDate?: string; endDate?: string; routeUrl?: string }): Promise<Trip> => {
    return request<Trip>('/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Trip>): Promise<any> => {
    return request(`/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<any> => {
    return request(`/trips/${id}`, { method: 'DELETE' });
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
