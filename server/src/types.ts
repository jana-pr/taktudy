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
  country_region?: string;
  travelers_count?: number;
  primary_transport?: string;
  room_scenario?: '2+1' | 'triple';
  budget_currency?: string;
  notes?: string;
  start_date?: string;
  end_date?: string;
  bounding_box?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  route_url?: string;
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
  start_location?: string;
  overnight_location?: string;
  transit_time_est?: string;
  distance_km?: number;
  transport_mode?: string;
  recommended_departure?: string;
  activities?: string;
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

export interface Accommodation {
  id: string;
  trip_id: string;
  day_id?: string;
  hotel_name: string;
  location?: string;
  booking_url?: string;
  price_total: number;
  price_single?: number;
  price_currency: string;
  rooms_count: number;
  room_type?: string;
  breakfast_included: boolean;
  cancellation_policy?: string;
  booking_status: 'confirmed' | 'pending' | 'reserved' | 'optional';
  booking_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TransportService {
  id: string;
  trip_id: string;
  service_name: string;
  provider?: string;
  total_price: number;
  currency: string;
  includes_description?: string;
  split_between: number;
  created_at: string;
  updated_at: string;
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
  is_mandatory?: boolean;
  is_enabled?: boolean;
  why_visit?: string;
  recommended_duration?: string;
  cost_est?: number;
  cost_currency?: string;
  cost_category?: 'tickets' | 'safari' | 'activities' | 'transport' | 'food' | 'other';
  data_origin?: 'user' | 'imported' | 'ai_completed' | 'needs_completion';
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

export interface Reminder {
  id: string;
  trip_id: string;
  title: string;
  category: 'restaurant' | 'tickets' | 'transport' | 'activity' | 'general';
  remind_at: string;
  notes?: string | null;
  is_completed: boolean;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface FullTrip extends Trip {
  stages: Stage[];
  days: Day[];
  subRoutes: SubRoute[];
  pois: POI[];
  accommodations?: Accommodation[];
  transportServices?: TransportService[];
  bookings?: any[];
  reminders?: Reminder[];
  isReadOnly?: boolean;
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
