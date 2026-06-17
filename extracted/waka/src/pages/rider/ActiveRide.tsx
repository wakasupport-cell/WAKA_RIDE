import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import { Phone, MessageCircle, AlertTriangle, ChevronDown, Star } from 'lucide-react'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { formatSLL, VEHICLE_CONFIG } from '@/lib/constants'
import { Button, Card, BookingStatusBadge, Spinner } from '@/components/ui'
import type { Booking, Driver, Profile } from '@/types'

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

const driverIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:40px;height:40px;
    background:linear-gradient(135deg,#F59E0B,#EA580C);
    border:3px solid white;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
    box-shadow:0 4px 12px rgba(245,158,11,0.5);
  ">🚗</div>`,
  iconSize: [40, 40], iconAnchor: [20, 20],
})

const STATUS_MESSAGES: Record<string, { title: string; subtitle: string; color: string }> = {
  pending: {
    title: 'Finding your driver...',
    subtitle: 'Hang tight — we\'re connecting you with a nearby driver.',
    color: '#F59E0B',
  },
  accepted: {
    title: 'Driver assigned!',
    subtitle: 'Your driver is getting ready to head your way.',
    color: '#3B82F6',
  },
  driver_en_route: {
    title: 'Driver on the way',
    subtitle: 'Your driver is heading to your pickup location.',
    color: '#3B82F6',
  },
  arrived: {
    title: 'Driver has arrived!',
    subtitle: 'Your driver is waiting at the pickup point.',
    color: '#22C55E',
  },
  in_progress: {
    title: 'Ride in progress',
    subtitle: 'Enjoy your ride! Sit back and relax.',
    color: '#22C55E',
  },
  completed: {
    title: 'You\'ve arrived!',
    subtitle: 'Trip complete. How was your ride?',
    color: '#22C55E',
  },
  cancelled: {
    title: 'Ride cancelled',
    subtitle: 'This booking was cancelled.',
    color: '#EF4444',
  },
}

export const ActiveRide = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null)
  const [driverPosition, setDriverPosition] = useState<[number, number] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [sheetExpanded, setSheetExpanded] = useState(true)

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
        if (data.driver_id) fetchDriver(data.driver_id)
      }
      setIsLoading(false)
    }

    fetchBooking()

    // Real-time booking updates
    const bookingChannel = supabase
      .channel(`active-ride-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new as Booking
        setBooking(updated)

        if (updated.status === 'completed') {
          setTimeout(() => navigate(`/rider/rate/${id}`), 1500)
        }
        if (updated.driver_id && !driver) fetchDriver(updated.driver_id)
      })
      .subscribe()

    return () => { supabase.removeChannel(bookingChannel) }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDriver = async (driverId: string) => {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single()

    if (data) {
      setDriver(data as Driver)
      if (data.current_lat && data.current_lng) {
        setDriverPosition([data.current_lat, data.current_lng])
      }
      fetchDriverProfile(data.profile_id)
    }

    // Real-time driver location
    const driverChannel = supabase
      .channel(`driver-location-${driverId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'drivers',
        filter: `id=eq.${driverId}`,
      }, (payload) => {
        const d = payload.new as Driver
        if (d.current_lat && d.current_lng) {
          setDriverPosition([d.current_lat, d.current_lng])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(driverChannel) }
  }

  const fetchDriverProfile = async (profileId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()
    if (data) setDriverProfile(data as Profile)
  }

  const handleCancel = async () => {
    if (!booking) return
    setIsCancelling(true)
    await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancellation_reason: 'Cancelled by rider' })
      .eq('id', booking.id)
    setIsCancelling(false)
    navigate('/rider')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!booking) return null

  const statusInfo = STATUS_MESSAGES[booking.status] ?? STATUS_MESSAGES.pending
  const center: [number, number] = driverPosition
    ?? [booking.pickup_lat, booking.pickup_lng]

  const canCancel = ['pending', 'accepted'].includes(booking.status)

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={14}
          className="w-full h-full z-0"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <Marker
            position={[booking.pickup_lat, booking.pickup_lng]}
            icon={pickupIcon}
          />
          <Marker
            position={[booking.destination_lat, booking.destination_lng]}
            icon={destIcon}
          />
          {driverPosition && (
            <Marker position={driverPosition} icon={driverIcon} />
          )}
          {driverPosition && (
            <Polyline
              positions={[driverPosition, [booking.pickup_lat, booking.pickup_lng]]}
              color="#F59E0B"
              weight={3}
              opacity={0.6}
              dashArray="6,4"
            />
          )}
        </MapContainer>

        {/* Status Pill */}
        <motion.div
          key={booking.status}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 right-4 z-10"
        >
          <div
            className="rounded-2xl px-4 py-3 backdrop-blur-md border"
            style={{
              backgroundColor: statusInfo.color + '20',
              borderColor: statusInfo.color + '40',
            }}
          >
            <div className="flex items-center gap-2">
              {booking.status === 'pending' && (
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: statusInfo.color }} />
              )}
              <div>
                <p className="text-white font-semibold text-sm">{statusInfo.title}</p>
                <p className="text-slate-400 text-xs">{statusInfo.subtitle}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Sheet */}
      <motion.div
        animate={{ height: sheetExpanded ? 'auto' : '80px' }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-slate-900 border-t border-slate-800 rounded-t-3xl overflow-hidden"
      >
        {/* Handle */}
        <button
          className="w-full flex justify-center pt-3 pb-1"
          onClick={() => setSheetExpanded(!sheetExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-1 bg-slate-600 rounded-full" />
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform ${sheetExpanded ? '' : 'rotate-180'}`}
            />
          </div>
        </button>

        <div className="px-4 pb-8">
          {/* Fare */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs">Total fare</p>
              <p className="text-amber-400 font-bold text-2xl">
                {formatSLL(booking.fare_amount)}
              </p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          {/* Driver Card */}
          <AnimatePresence>
            {driver && driverProfile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                      {driverProfile.full_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{driverProfile.full_name}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-amber-400 text-sm font-medium">
                          {driver.average_rating.toFixed(1)}
                        </span>
                        <span className="text-slate-500 text-xs">· {driver.total_trips} trips</span>
                      </div>
                    </div>
                    <div className="text-2xl">
                      {VEHICLE_CONFIG[booking.vehicle_type].emoji}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-3">
                    <a
                      href={`tel:${driverProfile.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-700 rounded-xl py-2.5 text-white text-sm font-medium"
                    >
                      <Phone className="w-4 h-4" /> Call
                    </a>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-slate-700 rounded-xl py-2.5 text-white text-sm font-medium">
                      <MessageCircle className="w-4 h-4" /> Message
                    </button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trip route summary */}
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

          {/* Cancel */}
          {canCancel && !showCancelConfirm && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full flex items-center justify-center gap-2 text-red-400 text-sm py-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Cancel Ride
            </button>
          )}

          <AnimatePresence>
            {showCancelConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mt-2"
              >
                <p className="text-white text-sm font-medium mb-1">Cancel this ride?</p>
                <p className="text-slate-400 text-xs mb-3">
                  Frequent cancellations may affect your account.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    isLoading={isCancelling}
                    onClick={handleCancel}
                  >
                    Yes, Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Keep Ride
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
