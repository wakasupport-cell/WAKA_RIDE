// Auto-generated Supabase database types
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          avatar_url: string | null
          role: 'rider' | 'driver' | 'admin'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          phone?: string | null
          avatar_url?: string | null
          role: 'rider' | 'driver' | 'admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          avatar_url?: string | null
          role?: 'rider' | 'driver' | 'admin'
          is_active?: boolean
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          profile_id: string
          license_number: string
          national_id_number: string
          license_doc_url: string | null
          national_id_doc_url: string | null
          driver_photo_url: string | null
          status: 'pending_approval' | 'approved' | 'rejected' | 'suspended'
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
        }
        Insert: {
          id?: string
          profile_id: string
          license_number: string
          national_id_number: string
          license_doc_url?: string | null
          national_id_doc_url?: string | null
          driver_photo_url?: string | null
          status?: 'pending_approval' | 'approved' | 'rejected' | 'suspended'
          approval_notes?: string | null
          total_trips?: number
          average_rating?: number
          is_online?: boolean
          current_lat?: number | null
          current_lng?: number | null
          approved_at?: string | null
          approved_by?: string | null
        }
        Update: {
          license_number?: string
          national_id_number?: string
          license_doc_url?: string | null
          national_id_doc_url?: string | null
          driver_photo_url?: string | null
          status?: 'pending_approval' | 'approved' | 'rejected' | 'suspended'
          approval_notes?: string | null
          total_trips?: number
          average_rating?: number
          is_online?: boolean
          current_lat?: number | null
          current_lng?: number | null
          approved_at?: string | null
          approved_by?: string | null
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          driver_id: string
          vehicle_type: 'keke' | 'taxi' | 'premium'
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
        Insert: {
          id?: string
          driver_id: string
          vehicle_type: 'keke' | 'taxi' | 'premium'
          make: string
          model: string
          year: number
          color: string
          plate_number: string
          registration_number: string
          vehicle_photo_url?: string | null
          is_active?: boolean
        }
        Update: {
          vehicle_type?: 'keke' | 'taxi' | 'premium'
          make?: string
          model?: string
          year?: number
          color?: string
          plate_number?: string
          registration_number?: string
          vehicle_photo_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          rider_id: string
          driver_id: string | null
          vehicle_type: 'keke' | 'taxi' | 'premium'
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          destination_address: string
          destination_lat: number
          destination_lng: number
          distance_km: number
          fare_amount: number
          status: 'pending' | 'accepted' | 'driver_en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
          cancellation_reason: string | null
          payment_method: 'orange_money' | 'afri_money' | 'q_money' | null
          payment_status: 'pending' | 'submitted' | 'confirmed' | 'failed'
          payment_reference: string | null
          rated_by_rider: boolean
          created_at: string
          accepted_at: string | null
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          rider_id: string
          driver_id?: string | null
          vehicle_type: 'keke' | 'taxi' | 'premium'
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          destination_address: string
          destination_lat: number
          destination_lng: number
          distance_km: number
          fare_amount: number
          status?: 'pending' | 'accepted' | 'driver_en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
          payment_method?: 'orange_money' | 'afri_money' | 'q_money' | null
          payment_status?: 'pending' | 'submitted' | 'confirmed' | 'failed'
        }
        Update: {
          driver_id?: string | null
          status?: 'pending' | 'accepted' | 'driver_en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
          cancellation_reason?: string | null
          payment_method?: 'orange_money' | 'afri_money' | 'q_money' | null
          payment_status?: 'pending' | 'submitted' | 'confirmed' | 'failed'
          payment_reference?: string | null
          rated_by_rider?: boolean
          accepted_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
      }
      fare_settings: {
        Row: {
          id: string
          vehicle_type: 'keke' | 'taxi' | 'premium'
          base_fare: number
          per_km_rate: number
          minimum_fare: number
          surge_multiplier: number
          is_active: boolean
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_type: 'keke' | 'taxi' | 'premium'
          base_fare: number
          per_km_rate: number
          minimum_fare: number
          surge_multiplier?: number
          is_active?: boolean
          updated_by?: string | null
        }
        Update: {
          base_fare?: number
          per_km_rate?: number
          minimum_fare?: number
          surge_multiplier?: number
          is_active?: boolean
          updated_by?: string | null
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          currency: string
          payment_method: 'orange_money' | 'afri_money' | 'q_money'
          reference_code: string | null
          status: 'pending' | 'submitted' | 'confirmed' | 'failed'
          confirmed_by: string | null
          confirmed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          amount: number
          currency?: string
          payment_method: 'orange_money' | 'afri_money' | 'q_money'
          reference_code?: string | null
          status?: 'pending' | 'submitted' | 'confirmed' | 'failed'
        }
        Update: {
          reference_code?: string | null
          status?: 'pending' | 'submitted' | 'confirmed' | 'failed'
          confirmed_by?: string | null
          confirmed_at?: string | null
        }
      }
      ratings: {
        Row: {
          id: string
          booking_id: string
          rider_id: string
          driver_id: string
          score: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          rider_id: string
          driver_id: string
          score: number
          comment?: string | null
        }
        Update: {
          score?: number
          comment?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          data: Json | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body: string
          data?: Json | null
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: 'rider' | 'driver' | 'admin'
      driver_status: 'pending_approval' | 'approved' | 'rejected' | 'suspended'
      vehicle_type: 'keke' | 'taxi' | 'premium'
      booking_status: 'pending' | 'accepted' | 'driver_en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
      payment_method: 'orange_money' | 'afri_money' | 'q_money'
      payment_status: 'pending' | 'submitted' | 'confirmed' | 'failed'
    }
  }
}
