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
  is_mandatory?: boolean;
  is_enabled?: boolean;
  why_visit?: string | null;
  recommended_duration?: string | null;
  cost_est?: number;
  cost_currency?: string;
  cost_category?: 'tickets' | 'safari' | 'activities' | 'transport' | 'food' | 'other';
  data_origin?: 'user' | 'imported' | 'ai_completed' | 'needs_completion';
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
  start_location?: string | null;
  overnight_location?: string | null;
  transit_time_est?: string | null;
  distance_km?: number;
  transport_mode?: string | null;
  recommended_departure?: string | null;
  activities?: string | null;
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

export interface Accommodation {
  id: string;
  trip_id: string;
  day_id?: string | null;
  hotel_name: string;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  booking_url?: string | null;
  price_total: number;
  price_single?: number;
  price_currency: string;
  rooms_count: number;
  room_type?: string | null;
  breakfast_included: boolean;
  cancellation_policy?: string | null;
  booking_status: 'confirmed' | 'pending' | 'reserved' | 'optional';
  booking_reference?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  type: 'transport' | 'flight' | 'train' | 'activity' | 'insurance' | 'visa' | 'accommodation' | 'other';
  title: string;
  provider?: string | null;
  confirmation_number?: string | null;
  booking_date?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  price?: number;
  currency?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
  contact_phone?: string | null;
  contact_email?: string | null;
  document_url?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TransportService {
  id: string;
  trip_id: string;
  service_name: string;
  provider?: string | null;
  total_price: number;
  currency: string;
  includes_description?: string | null;
  split_between: number;
  created_at?: string;
  updated_at?: string;
}

export interface Trip {
  id: string;
  owner_id: string;
  title: string;
  motto?: string | null;
  status: TripStatus;
  country_region?: string | null;
  travelers_count?: number;
  primary_transport?: string | null;
  room_scenario?: '2+1' | 'triple';
  budget_currency?: string;
  notes?: string | null;
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
  bookings?: Booking[];
  reminders?: Reminder[];
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

export interface Tip {
  id: string;
  user_id: string;
  trip_id?: string | null;
  title: string;
  category_id: string;
  location_name?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
  source_url?: string | null;
  photo_url?: string | null;
  is_used: boolean | number;
  category_label?: string;
  category_icon?: string;
  category_color?: string;
  created_at: string;
  updated_at: string;
}
