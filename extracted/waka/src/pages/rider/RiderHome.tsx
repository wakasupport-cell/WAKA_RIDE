import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { Bell, Navigation, Clock, Star } from 'lucide-react'
import L from 'leaflet'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button, WakaLogo, BookingStatusBadge } from '@/components/ui'
import { RiderBottomNav } from '@/components/rider/RiderBottomNav'
import type { Booking } from '@/types'

// Freetown center
const FREETOWN: [number, number] = [8.4657, -13.2317]

// Custom marker icons
const createIcon = (color: string, size = 32) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:3px solid white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })

const userIcon = createIcon('#F59E0B')

// Map re-centering component
const MapController = ({ position }: { position: [number, number] | null }) => {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.setView(position, 15, { animate: true })
    }
  }, [position, map])
  return null
}

export const RiderHome = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [activeRide, setActiveRide] = useState<Booking | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const watchIdRef = useRef<number | null>(null)

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude])
      },
      () => {
        // Default to Freetown if location denied
        setUserPosition(FREETOWN)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  // Check for active ride
  useEffect(() => {
    if (!profile?.id) return

    const fetchActiveRide = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('rider_id', profile.id)
        .in('status', ['pending', 'accepted', 'driver_en_route', 'arrived', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) setActiveRide(data as Booking)
    }

    fetchActiveRide()

    // Real-time subscription
    const channel = supabase
      .channel(`rider-home-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `rider_id=eq.${profile.id}`,
      }, (payload) => {
        const booking = payload.new as Booking
        if (['pending', 'accepted', 'driver_en_route', 'arrived', 'in_progress'].includes(booking.status)) {
          setActiveRide(booking)
        } else {
          setActiveRide(null)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  // Unread notifications
  useEffect(() => {
    if (!profile?.id) return

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)

      setUnreadCount(count ?? 0)
    }

    fetchUnread()
  }, [profile?.id])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Map - Full Background */}
      <div className="flex-1 relative">
        <MapContainer
          center={userPosition ?? FREETOWN}
          zoom={14}
          className="w-full h-full z-0"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController position={userPosition} />
          {userPosition && (
            <Marker position={userPosition} icon={userIcon} />
          )}
        </MapContainer>

        {/* Top Bar Overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/90 backdrop-blur-md rounded-2xl px-4 py-2"
            >
              <p className="text-slate-400 text-xs">{getGreeting()},</p>
              <p className="text-white font-bold text-base">{firstName}</p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative w-11 h-11 bg-slate-900/90 backdrop-blur-md rounded-full flex items-center justify-center"
              onClick={() => navigate('/rider/profile')}
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full text-xs text-white font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Active Ride Banner */}
        {activeRide && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-20 left-4 right-4 z-10"
          >
            <button
              onClick={() => navigate(`/rider/ride/${activeRide.id}`)}
              className="w-full bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">Active Ride</p>
                  <BookingStatusBadge status={activeRide.status} />
                </div>
              </div>
              <div className="text-amber-400 text-sm font-medium">Track →</div>
            </button>
          </motion.div>
        )}

        {/* My Location Button */}
        <button
          onClick={() => userPosition && setUserPosition([...userPosition])}
          className="absolute bottom-36 right-4 z-10 w-11 h-11 bg-slate-900/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-slate-700"
        >
          <Navigation className="w-5 h-5 text-amber-400" />
        </button>

        {/* Bottom Sheet */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 20 }}
          className="absolute bottom-0 left-0 right-0 z-10"
        >
          <div className="bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 rounded-t-3xl px-4 pt-4 pb-24">
            {/* Handle */}
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />

            <div className="flex items-center gap-3 mb-4">
              <WakaLogo size="sm" />
              <p className="text-slate-400 text-sm">Where do you want to go?</p>
            </div>

            <Button
              fullWidth
              size="lg"
              onClick={() => navigate('/rider/book')}
              leftIcon={<Navigation className="w-5 h-5" />}
            >
              Book a Ride
            </Button>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => navigate('/rider/rides')}
                className="flex items-center gap-2 bg-slate-800 rounded-2xl p-3"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 text-sm font-medium">Recent Rides</span>
              </button>
              <button
                onClick={() => navigate('/rider/profile')}
                className="flex items-center gap-2 bg-slate-800 rounded-2xl p-3"
              >
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 text-sm font-medium">My Profile</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <RiderBottomNav />
    </div>
  )
}
