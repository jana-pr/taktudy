export type TripStatus = 'idea' | 'planning' | 'ready' | 'traveling' | 'completed' | 'archived';

export type TimeMode = 'none' | 'approximate' | 'fixed';

export type VisitStatus = 'unvisited' | 'visited' | 'skipped';

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
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
  stage_id?: string | null;
  day_id?: string | null;
  sub_route_id?: string | null;
  category_id: string;
  name: string;
  is_top: boolean;
  lat: number;
  lng: number;
  address?: string | null;
  description?: string | null;
  private_notes?: string | null;
  opening_hours?: string | null;
  source_url?: string | null;
  external_links?: { label: string; url: string }[];
  time_mode: TimeMode;
  target_time?: string | null;
  visit_status: VisitStatus;
  notification_config?: {
    geofence_meters?: number;
    time_lead_minutes?: number;
  } | null;
  main_photo_url?: string | null;
  photos?: string[];
  sort_order: number;
  version: number;
  is_deleted?: boolean;
  category_label?: string;
  category_icon?: string;
  category_color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Stage {
  id: string;
  trip_id: string;
  title: string;
  notes?: string;
  sort_order: number;
  has_detail: boolean;
  version: number;
}

export interface Day {
  id: string;
  trip_id: string;
  stage_id?: string | null;
  day_number: number;
  specific_date?: string | null;
  title: string;
  notes?: string;
  has_detail: boolean;
  version: number;
}

export interface SubRoute {
  id: string;
  trip_id: string;
  day_id?: string | null;
  title: string;
  coordinates: [number, number][];
  version: number;
}

export interface Trip {
  id: string;
  owner_id: string;
  title: string;
  motto?: string | null;
  status: TripStatus;
  start_date?: string | null;
  end_date?: string | null;
  bounding_box?: [number, number, number, number] | null;
  route_url?: string | null;
  version: number;
  poi_count?: number;
  day_count?: number;
  created_at: string;
  updated_at: string;
}

export interface FullTrip extends Trip {
  stages: Stage[];
  days: Day[];
  subRoutes: SubRoute[];
  pois: POI[];
  isReadOnly?: boolean;
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
