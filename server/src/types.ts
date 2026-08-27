export type TripStatus = 'idea' | 'planning' | 'ready' | 'traveling' | 'completed' | 'archived';

export type TimeMode = 'none' | 'approximate' | 'fixed';

export type VisitStatus = 'unvisited' | 'visited' | 'skipped';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: string;
}

export interface Trip {
  id: string;
  owner_id: string;
  title: string;
  motto?: string;
  status: TripStatus;
  start_date?: string;
  end_date?: string;
  bounding_box?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  version: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  trip_id: string;
  title: string;
  notes?: string;
  sort_order: number;
  has_detail: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Day {
  id: string;
  trip_id: string;
  stage_id?: string;
  day_number: number;
  specific_date?: string;
  title: string;
  notes?: string;
  has_detail: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface SubRoute {
  id: string;
  trip_id: string;
  day_id?: string;
  title: string;
  coordinates: [number, number][]; // LineString coords [lng, lat]
  version: number;
}

export interface Category {
  id: string;
  label_cs: string;
  icon_name: string;
  default_color: string;
}

export interface POI {
  id: string;
  trip_id: string;
  stage_id?: string;
  day_id?: string;
  sub_route_id?: string;
  category_id: string;
  name: string;
  is_top: boolean;
  lat: number;
  lng: number;
  address?: string;
  description?: string;
  private_notes?: string;
  opening_hours?: string;
  source_url?: string;
  external_links?: { label: string; url: string }[];
  time_mode: TimeMode;
  target_time?: string; // HH:mm format
  visit_status: VisitStatus;
  notification_config?: {
    geofence_meters?: number;
    time_lead_minutes?: number;
  };
  main_photo_url?: string;
  photos?: string[];
  sort_order: number;
  version: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShareToken {
  id: string;
  trip_id: string;
  token: string;
  is_active: boolean;
  include_notes: boolean;
  created_at: string;
}

export interface SyncMutation {
  id: string;
  entity: 'trip' | 'stage' | 'day' | 'poi';
  entity_id: string;
  action: 'UPSERT' | 'DELETE';
  payload: any;
  client_timestamp: string;
  client_version: number;
}
