import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import { Phone, ArrowLeft, CheckCircle } from 'lucide-react'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { formatSLL, VEHICLE_CONFIG } from '@/lib/constants'
import { Button, Card, Spinner } from '@/components/ui'
import type { Booking, BookingStatus, Profile } from '@/types'

const pickupIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#22C55E;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
})
const destIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;background:#F59E0B;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
})

const TRIP_FLOW: { status: BookingStatus; label: string; action: string; color: string }[] = [
  { status: 'driver_en_route', label: 'Heading to pickup', action: 'I\'ve Arrived', color: '#3B82F6' },
  { status: 'arrived', label: 'Arrived at pickup', action: 'Start Trip', color: '#22C55E' },
  { status: 'in_progress', label: 'Trip in progress', action: 'Complete Trip', color: '#22C55E' },
  { status: 'completed', label: 'Trip completed', action: '', color: '#94A3B8' },
]

export const DriverTrip = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [riderProfile, setRiderProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchBooking = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        setBooking(data as Booking)
        fetchRiderProfile(data.rider_id)

        // If just accepted, set to en route
        if (data.status === 'accepted') {
          await supabase
            .from('bookings')
            .update({ status: 'driver_en_route' })
            .eq('id', id)
          setBooking({ ...data, status: 'driver_en_route' })
        }
      }
      setIsLoading(false)
    }
    fetchBooking()

    // Real-time updates
    const channel = supabase
      .channel(`driver-trip-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${id}`,
      }, (payload) => {
        setBooking(payload.new as Booking)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  const fetchRiderProfile = async (riderId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', riderId).single()
    if (data) setRiderProfile(data as Profile)
  }

  const handleAdvanceStatus = async () => {
    if (!booking) return
    setIsUpdating(true)

    const nextStatusMap: Partial<Record<BookingStatus, BookingStatus>> = {
      driver_en_route: 'arrived',
      arrived: 'in_progress',
      in_progress: 'completed',
    }

    const nextStatus = nextStatusMap[booking.status]
    if (!nextStatus) return

    await supabase
      .from('bookings')
      .update({ status: nextStatus })
      .eq('id', booking.id)

    setIsUpdating(false)

    if (nextStatus === 'completed') {
      setTimeout(() => navigate('/driver'), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!booking) return null

  const currentFlow = TRIP_FLOW.find(f => f.status === booking.status)
  const isCompleted = booking.status === 'completed'

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[booking.pickup_lat, booking.pickup_lng]}
          zoom={14}
          className="w-full h-full z-0"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[booking.pickup_lat, booking.pickup_lng]} icon={pickupIcon} />
          <Marker position={[booking.destination_lat, booking.destination_lng]} icon={destIcon} />
        </MapContainer>

        <button
          onClick={() => navigate('/driver')}
          className="absolute top-4 left-4 z-10 w-10 h-10 bg-slate-900/90 backdrop-blur-md rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Status bar */}
        <div
          className="absolute top-4 left-16 right-4 z-10 rounded-2xl px-4 py-3 backdrop-blur-md"
          style={{ backgroundColor: (currentFlow?.color ?? '#94A3B8') + '20', borderColor: (currentFlow?.color ?? '#94A3B8') + '40', borderWidth: 1 }}
        >
          <p className="text-white font-semibold text-sm">{currentFlow?.label}</p>
          <p className="text-slate-400 text-xs">{VEHICLE_CONFIG[booking.vehicle_type].label} · {booking.distance_km} km</p>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl px-4 pt-4 pb-8">
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

        {isCompleted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-1">Trip Completed!</h2>
            <p className="text-slate-400 text-sm mb-2">Fare: {formatSLL(booking.fare_amount)}</p>
            <p className="text-slate-500 text-xs">Returning to dashboard...</p>
          </motion.div>
        ) : (
          <>
            {/* Rider Info */}
            {riderProfile && (
              <Card className="p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                    {riderProfile.full_name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{riderProfile.full_name}</p>
                    <p className="text-slate-400 text-sm">{booking.distance_km} km trip</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold">{formatSLL(booking.fare_amount)}</p>
                  </div>
                </div>

                {riderProfile.phone && (
                  <a
                    href={`tel:${riderProfile.phone}`}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-700 rounded-xl py-2.5 text-white text-sm font-medium"
                  >
                    <Phone className="w-4 h-4" /> Call Rider
                  </a>
                )}
              </Card>
            )}

            {/* Locations */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-slate-300 truncate">{booking.pickup_address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-300 truncate">{booking.destination_address}</span>
              </div>
            </div>

            {currentFlow && currentFlow.action && (
              <Button
                fullWidth
                size="lg"
                isLoading={isUpdating}
                onClick={handleAdvanceStatus}
                style={{ backgroundColor: currentFlow.color }}
                className="border-0"
              >
                {currentFlow.action}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
