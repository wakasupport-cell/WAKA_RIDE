import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Power, MapPin, Navigation, Clock, Star, TrendingUp, Bell, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatSLL, VEHICLE_CONFIG } from '@/lib/constants'
import { Button, Card, Badge, WakaLogo, Spinner } from '@/components/ui'
import type { Booking, Driver } from '@/types'

export const DriverDashboard = () => {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [driver, setDriver] = useState<Driver | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [pendingRide, setPendingRide] = useState<Booking | null>(null)
  const [activeRide, setActiveRide] = useState<Booking | null>(null)
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [todayTrips, setTodayTrips] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isTogglingOnline, setIsTogglingOnline] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    fetchDriverData()
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDriverData = async () => {
    if (!profile?.id) return

    const { data: driverData } = await supabase
      .from('drivers')
      .select('*')
      .eq('profile_id', profile.id)
      .single()

    if (!driverData) {
      navigate('/driver/onboarding')
      return
    }

    setDriver(driverData as Driver)
    setIsOnline(driverData.is_online)

    // Fetch today's earnings
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('fare_amount, status')
      .eq('driver_id', driverData.id)
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString())

    if (todayBookings) {
      setTodayEarnings(todayBookings.reduce((sum, b) => sum + b.fare_amount, 0))
      setTodayTrips(todayBookings.length)
    }

    // Check for active ride
    const { data: active } = await supabase
      .from('bookings')
      .select('*')
      .eq('driver_id', driverData.id)
      .in('status', ['accepted', 'driver_en_route', 'arrived', 'in_progress'])
      .limit(1)
      .single()

    if (active) setActiveRide(active as Booking)

    setIsLoading(false)
    subscribeToRideRequests(driverData.id)
    startLocationBroadcast(driverData.id, driverData.is_online)
  }

  const subscribeToRideRequests = (driverId: string) => {
    const channel = supabase
      .channel(`driver-requests-${driverId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings',
        filter: 'status=eq.pending',
      }, (payload) => {
        const booking = payload.new as Booking
        if (isOnline && driver?.status === 'approved') {
          setPendingRide(booking)
          // Auto-dismiss after 30 seconds
          setTimeout(() => setPendingRide((prev) => prev?.id === booking.id ? null : prev), 30000)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  let locationInterval: ReturnType<typeof setInterval>

  const startLocationBroadcast = (driverId: string, online: boolean) => {
    if (!online) return

    const broadcast = () => {
      navigator.geolocation?.getCurrentPosition((pos) => {
        supabase.from('drivers').update({
          current_lat: pos.coords.latitude,
          current_lng: pos.coords.longitude,
        }).eq('id', driverId)
      })
    }

    broadcast()
    locationInterval = setInterval(broadcast, 5000)
  }

  const handleToggleOnline = async () => {
    if (!driver) return
    setIsTogglingOnline(true)

    const newStatus = !isOnline
    await supabase.from('drivers').update({ is_online: newStatus }).eq('id', driver.id)
    setIsOnline(newStatus)

    if (newStatus) {
      startLocationBroadcast(driver.id, true)
    } else {
      clearInterval(locationInterval)
    }

    setIsTogglingOnline(false)
  }

  const handleAcceptRide = async (booking: Booking) => {
    if (!driver) return

    const { error } = await supabase
      .from('bookings')
      .update({ driver_id: driver.id, status: 'accepted' })
      .eq('id', booking.id)
      .eq('status', 'pending')

    if (!error) {
      setPendingRide(null)
      setActiveRide(booking)
      navigate(`/driver/trip/${booking.id}`)
    }
  }

  const handleDeclineRide = () => setPendingRide(null)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Pending approval state
  if (driver?.status === 'pending_approval') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Under Review</h2>
          <p className="text-slate-400 mb-6 text-sm">
            Your application is being reviewed by our team. You'll be notified
            within 24 hours once approved.
          </p>
          <Badge variant="amber">Pending Approval</Badge>
          <div className="mt-8">
            <button onClick={signOut} className="flex items-center gap-2 text-slate-400 text-sm mx-auto">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Rejected state
  if (driver?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Application Rejected</h2>
          <p className="text-slate-400 mb-4 text-sm">
            {driver.approval_notes ?? 'Your application was not approved.'}
          </p>
          <p className="text-slate-500 text-xs">Contact support@waka.sl for assistance.</p>
          <button onClick={signOut} className="mt-6 flex items-center gap-2 text-slate-400 text-sm mx-auto">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-8">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <WakaLogo size="sm" />
          <p className="text-slate-400 text-xs mt-0.5">Driver Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center">
            <Bell className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={signOut}
            className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Online Toggle */}
      <div className="px-4 mb-6">
        <div className={`rounded-3xl p-5 flex items-center justify-between transition-all ${
          isOnline
            ? 'bg-green-500/20 border border-green-500/40'
            : 'bg-slate-800 border border-slate-700'
        }`}>
          <div>
            <p className="text-white font-bold text-lg">
              {isOnline ? 'You\'re Online' : 'You\'re Offline'}
            </p>
            <p className="text-slate-400 text-sm">
              {isOnline ? 'Ready to accept rides' : 'Go online to receive ride requests'}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleOnline}
            disabled={isTogglingOnline}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isOnline
                ? 'bg-green-500 shadow-green-500/40'
                : 'bg-slate-600 shadow-slate-900/40'
            }`}
          >
            {isTogglingOnline ? (
              <Spinner size="sm" />
            ) : (
              <Power className="w-7 h-7 text-white" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Active Ride Banner */}
      {activeRide && (
        <div className="px-4 mb-4">
          <button
            onClick={() => navigate(`/driver/trip/${activeRide.id}`)}
            className="w-full bg-amber-500/20 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-semibold">Active Trip</p>
              <p className="text-slate-400 text-xs truncate">{activeRide.pickup_address}</p>
            </div>
            <span className="text-amber-400 text-sm font-medium">Resume →</span>
          </button>
        </div>
      )}

      {/* Today Stats */}
      <div className="px-4 mb-6">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Today</p>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <TrendingUp className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-white">{formatSLL(todayEarnings)}</p>
            <p className="text-slate-400 text-xs">Earnings</p>
          </Card>
          <Card className="p-4">
            <Navigation className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-white">{todayTrips}</p>
            <p className="text-slate-400 text-xs">Trips Completed</p>
          </Card>
        </div>
      </div>

      {/* Driver Stats */}
      {driver && (
        <div className="px-4 mb-6">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Overall</p>
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-white font-bold">{driver.average_rating.toFixed(1)}</span>
                </div>
                <p className="text-slate-500 text-xs">Rating</p>
              </div>
              <div>
                <p className="text-white font-bold mb-1">{driver.total_trips}</p>
                <p className="text-slate-500 text-xs">Total Trips</p>
              </div>
              <div>
                <Badge variant={driver.status === 'approved' ? 'green' : 'amber'}>
                  {driver.status === 'approved' ? 'Active' : driver.status}
                </Badge>
                <p className="text-slate-500 text-xs mt-1">Status</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Actions</p>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/driver/earnings')}
            className="w-full flex items-center gap-3 bg-slate-800 rounded-2xl p-4 hover:bg-slate-700 transition-colors"
          >
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span className="text-white font-medium">View Earnings</span>
          </button>
          <button
            onClick={() => navigate('/driver/profile')}
            className="w-full flex items-center gap-3 bg-slate-800 rounded-2xl p-4 hover:bg-slate-700 transition-colors"
          >
            <Star className="w-5 h-5 text-amber-400" />
            <span className="text-white font-medium">My Profile</span>
          </button>
        </div>
      </div>

      {/* Incoming Ride Modal */}
      <AnimatePresence>
        {pendingRide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6"
            >
              {/* Pulse indicator */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center animate-pulse">
                    <Bell className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-amber-500/30 animate-ping" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white text-center mb-1">New Ride Request!</h2>
              <p className="text-slate-400 text-sm text-center mb-6">
                {VEHICLE_CONFIG[pendingRide.vehicle_type].label} · {pendingRide.distance_km} km
              </p>

              <Card className="p-4 mb-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-400 text-xs">Pickup</p>
                      <p className="text-white text-sm font-medium">{pendingRide.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Navigation className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-400 text-xs">Destination</p>
                      <p className="text-white text-sm font-medium">{pendingRide.destination_address}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-700 mt-3 pt-3 flex justify-between">
                  <span className="text-slate-400 text-sm">Fare</span>
                  <span className="text-amber-400 font-bold text-lg">
                    {formatSLL(pendingRide.fare_amount)}
                  </span>
                </div>
              </Card>

              <div className="flex gap-3">
                <Button variant="danger" fullWidth onClick={handleDeclineRide}>
                  Decline
                </Button>
                <Button fullWidth onClick={() => handleAcceptRide(pendingRide)}>
                  Accept
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
