import type { PaymentMethodConfig, FareEstimate, VehicleType } from '@/types'
import { supabase } from './supabase'

// ─── Payment Methods Config ───────────────────────────────────────────────────

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'orange_money',
    label: 'Orange Money',
    instructions: 'Dial *144# → Send Money → Enter merchant number and amount.',
    merchant_number: '076-123-456', // Replace with real merchant number
    color: '#EA580C',
    bg_color: '#FFF7ED',
  },
  {
    id: 'afri_money',
    label: 'Afri Money',
    instructions: 'Dial *144# → Afrimoney → Send Money → Enter merchant number.',
    merchant_number: '077-123-456', // Replace with real merchant number
    color: '#2563EB',
    bg_color: '#EFF6FF',
  },
  {
    id: 'q_money',
    label: 'Q Money',
    instructions: 'Open Q Money App → Pay Merchant → Enter merchant ID and amount.',
    merchant_number: '078-123-456', // Replace with real merchant ID
    merchant_id: 'WAKA001',
    color: '#7C3AED',
    bg_color: '#F5F3FF',
  },
]

export const getPaymentMethod = (id: string) =>
  PAYMENT_METHODS.find((m) => m.id === id)

// ─── Vehicle Config ───────────────────────────────────────────────────────────

export const VEHICLE_CONFIG = {
  keke: {
    label: 'Keke',
    description: 'Tricycle · 1-2 passengers',
    emoji: '🛺',
    eta: '3-5 min',
    color: '#22C55E',
  },
  taxi: {
    label: 'Taxi',
    description: 'Sedan · 1-4 passengers',
    emoji: '🚕',
    eta: '5-8 min',
    color: '#F59E0B',
  },
  premium: {
    label: 'Premium',
    description: 'SUV / Executive · 1-4 passengers',
    emoji: '🚙',
    eta: '8-12 min',
    color: '#8B5CF6',
  },
} as const

// ─── Fare Calculator ──────────────────────────────────────────────────────────

export const calculateFares = async (
  distanceKm: number
): Promise<FareEstimate[]> => {
  const { data: fareSettings, error } = await supabase
    .from('fare_settings')
    .select('*')
    .eq('is_active', true)

  if (error || !fareSettings) {
    // Fallback to defaults if DB unavailable
    return getDefaultFares(distanceKm)
  }

  return fareSettings.map((setting) => {
    const vehicleConfig = VEHICLE_CONFIG[setting.vehicle_type as VehicleType]
    const distanceFare = distanceKm * setting.per_km_rate
    const totalFare = Math.max(
      setting.base_fare + distanceFare * setting.surge_multiplier,
      setting.minimum_fare
    )

    return {
      vehicle_type: setting.vehicle_type as VehicleType,
      distance_km: distanceKm,
      base_fare: setting.base_fare,
      distance_fare: distanceFare,
      total_fare: Math.round(totalFare),
      label: vehicleConfig.label,
      eta_minutes: parseInt(vehicleConfig.eta.split('-')[0]),
    }
  })
}

const getDefaultFares = (distanceKm: number): FareEstimate[] => {
  const defaults = [
    { type: 'keke' as VehicleType, base: 5, rate: 3, min: 8 },
    { type: 'taxi' as VehicleType, base: 8, rate: 5, min: 15 },
    { type: 'premium' as VehicleType, base: 15, rate: 8, min: 25 },
  ]

  return defaults.map(({ type, base, rate, min }) => {
    const total = Math.max(base + distanceKm * rate, min)
    return {
      vehicle_type: type,
      distance_km: distanceKm,
      base_fare: base,
      distance_fare: distanceKm * rate,
      total_fare: Math.round(total),
      label: VEHICLE_CONFIG[type].label,
      eta_minutes: parseInt(VEHICLE_CONFIG[type].eta.split('-')[0]),
    }
  })
}

// ─── Distance Calculator (Haversine) ─────────────────────────────────────────

export const calculateDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return parseFloat((R * c).toFixed(2))
}

const toRad = (deg: number) => (deg * Math.PI) / 180

// ─── Format Currency ──────────────────────────────────────────────────────────

export const formatSLL = (amount: number): string => {
  return `SLL ${amount.toLocaleString()}`
}
