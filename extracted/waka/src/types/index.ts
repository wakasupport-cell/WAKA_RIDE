// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'rider' | 'driver' | 'admin'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export type DriverStatus = 'pending_approval' | 'approved' | 'rejected' | 'suspended'

export interface Driver {
  id: string
  profile_id: string
  license_number: string
  national_id_number: string
  license_doc_url: string | null
  national_id_doc_url: string | null
  driver_photo_url: string | null
  status: DriverStatus
  approval_notes: string | null
  total_trips: number
  average_rating: number
  is_online: boolean
  current_lat: number | null
  current_lng: number | null
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
  // Joined
  profile?: Profile
  vehicle?: Vehicle
}

// ─── Vehicle ──────────────────────────────────────────────────────────────────

export type VehicleType = 'keke' | 'taxi' | 'premium'

export interface Vehicle {
  id: string
  driver_id: string
  vehicle_type: VehicleType
  make: string
  model: string
  year: number
  color: string
  plate_number: string
  registration_number: string
  vehicle_photo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'driver_en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type PaymentMethod = 'orange_money' | 'afri_money' | 'q_money'

export type PaymentStatus = 'pending' | 'submitted' | 'confirmed' | 'failed'

export interface Booking {
  id: string
  rider_id: string
  driver_id: string | null
  vehicle_type: VehicleType
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  destination_address: string
  destination_lat: number
  destination_lng: number
  distance_km: number
  fare_amount: number
  status: BookingStatus
  cancellation_reason: string | null
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  payment_reference: string | null
  rated_by_rider: boolean
  created_at: string
  accepted_at: string | null
  completed_at: string | null
  updated_at: string
  // Joined
  rider?: Profile
  driver?: Driver
}

// ─── Fare Settings ────────────────────────────────────────────────────────────

export interface FareSettings {
  id: string
  vehicle_type: VehicleType
  base_fare: number
  per_km_rate: number
  minimum_fare: number
  surge_multiplier: number
  is_active: boolean
  updated_by: string | null
  updated_at: string
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface Payment {
  id: string
  booking_id: string
  amount: number
  currency: string
  payment_method: PaymentMethod
  reference_code: string | null
  status: PaymentStatus
  confirmed_by: string | null
  confirmed_at: string | null
  created_at: string
}

// ─── Rating ───────────────────────────────────────────────────────────────────

export interface Rating {
  id: string
  booking_id: string
  rider_id: string
  driver_id: string
  score: number
  comment: string | null
  created_at: string
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'booking_request'
  | 'booking_accepted'
  | 'driver_arrived'
  | 'trip_started'
  | 'trip_completed'
  | 'booking_cancelled'
  | 'payment_confirmed'
  | 'driver_approved'
  | 'driver_rejected'
  | 'driver_suspended'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

// ─── Map ──────────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number
  lng: number
}

export interface LocationResult {
  address: string
  lat: number
  lng: number
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export interface DashboardStats {
  total_riders: number
  total_drivers: number
  pending_drivers: number
  approved_drivers: number
  active_trips: number
  completed_trips_today: number
  total_revenue_today: number
  total_revenue_all_time: number
}

// ─── Fare Calculation ─────────────────────────────────────────────────────────

export interface FareEstimate {
  vehicle_type: VehicleType
  distance_km: number
  base_fare: number
  distance_fare: number
  total_fare: number
  label: string
  eta_minutes: number
}

// ─── Payment Config ───────────────────────────────────────────────────────────

export interface PaymentMethodConfig {
  id: PaymentMethod
  label: string
  instructions: string
  merchant_number: string
  merchant_id?: string
  color: string
  bg_color: string
}
