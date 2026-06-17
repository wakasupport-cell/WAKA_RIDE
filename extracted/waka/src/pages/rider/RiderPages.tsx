import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, MapPin, Clock, Navigation, LogOut, User, Phone, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatSLL, VEHICLE_CONFIG } from '@/lib/constants'
import { Button, Card, Badge, BookingStatusBadge, EmptyState, Spinner, WakaLogo } from '@/components/ui'
import { RiderBottomNav } from '@/components/rider/RiderBottomNav'
import type { Booking } from '@/types'

type RideFilter = 'all' | 'active' | 'completed' | 'cancelled'

// ─── My Rides ─────────────────────────────────────────────────────────────────

export const MyRides = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [rides, setRides] = useState<Booking[]>([])
  const [filter, setFilter] = useState<RideFilter>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    const fetchRides = async () => {
      const query = supabase
        .from('bookings')
        .select('*')
        .eq('rider_id', profile.id)
        .order('created_at', { ascending: false })

      const { data } = await query
      setRides((data ?? []) as Booking[])
      setIsLoading(false)
    }
    fetchRides()
  }, [profile?.id])

  const filteredRides = rides.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'active') return ['pending', 'accepted', 'driver_en_route', 'arrived', 'in_progress'].includes(r.status)
    if (filter === 'completed') return r.status === 'completed'
    if (filter === 'cancelled') return r.status === 'cancelled'
    return true
  })

  const filters: { key: RideFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white mb-4">My Rides</h1>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center pt-12"><Spinner size="lg" /></div>
      ) : filteredRides.length === 0 ? (
        <EmptyState
          icon={<Navigation className="w-8 h-8" />}
          title="No rides yet"
          description="Book your first ride and it will appear here."
          action={
            <Button onClick={() => navigate('/rider/book')}>Book a Ride</Button>
          }
        />
      ) : (
        <div className="px-4 space-y-3">
          {filteredRides.map((ride, i) => (
            <motion.div
              key={ride.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="p-4"
                hoverable
                onClick={() => {
                  if (['pending', 'accepted', 'driver_en_route', 'arrived', 'in_progress'].includes(ride.status)) {
                    navigate(`/rider/ride/${ride.id}`)
                  } else {
                    navigate(`/rider/rides/${ride.id}`)
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{VEHICLE_CONFIG[ride.vehicle_type].emoji}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {VEHICLE_CONFIG[ride.vehicle_type].label}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {new Date(ride.created_at).toLocaleDateString('en-SL', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold">{formatSLL(ride.fare_amount)}</p>
                    <BookingStatusBadge status={ride.status} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="text-slate-300 text-xs truncate">{ride.pickup_address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <p className="text-slate-300 text-xs truncate">{ride.destination_address}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                  <span className="text-slate-500 text-xs">{ride.distance_km} km</span>
                  {ride.status === 'completed' && !ride.rated_by_rider && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/rider/rate/${ride.id}`) }}
                      className="flex items-center gap-1 text-amber-400 text-xs font-medium"
                    >
                      <Star className="w-3.5 h-3.5" /> Rate Driver
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <RiderBottomNav />
    </div>
  )
}

// ─── Ride Detail ──────────────────────────────────────────────────────────────

export const RideDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase.from('bookings').select('*').eq('id', id).single()
      .then(({ data }) => {
        setBooking(data as Booking)
        setIsLoading(false)
      })
  }, [id])

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Spinner size="lg" /></div>
  if (!booking) return null

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="flex items-center gap-4 px-4 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Ride Details</h1>
      </div>

      <div className="px-4 space-y-4">
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{VEHICLE_CONFIG[booking.vehicle_type].emoji}</span>
              <div>
                <p className="text-white font-semibold">{VEHICLE_CONFIG[booking.vehicle_type].label}</p>
                <p className="text-slate-500 text-xs">{new Date(booking.created_at).toLocaleString()}</p>
              </div>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">Pickup</p>
                <p className="text-white text-sm">{booking.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Navigation className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">Destination</p>
                <p className="text-white text-sm">{booking.destination_address}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-white font-semibold mb-3">Trip Summary</h3>
          <div className="space-y-2">
            {[
              { label: 'Distance', value: `${booking.distance_km} km` },
              { label: 'Fare', value: formatSLL(booking.fare_amount), highlight: true },
              { label: 'Payment', value: booking.payment_method?.replace('_', ' ') ?? 'Not set' },
              { label: 'Payment Status', value: booking.payment_status },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span className={highlight ? 'text-amber-400 font-bold' : 'text-white capitalize'}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {booking.status === 'completed' && !booking.rated_by_rider && (
          <Button fullWidth onClick={() => navigate(`/rider/rate/${booking.id}`)}>
            Rate Your Driver
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Rate Page ────────────────────────────────────────────────────────────────

export const RatePage = () => {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [score, setScore] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!bookingId) return
    supabase.from('bookings').select('*').eq('id', bookingId).single()
      .then(({ data }) => { setBooking(data as Booking); setIsLoading(false) })
  }, [bookingId])

  const handleSubmit = async () => {
    if (!booking || !profile) return
    setIsSubmitting(true)

    try {
      await supabase.from('ratings').insert({
        booking_id: booking.id,
        rider_id: profile.id,
        driver_id: booking.driver_id!,
        score,
        comment: comment.trim() || null,
      })

      await supabase
        .from('bookings')
        .update({ rated_by_rider: true })
        .eq('id', booking.id)

      navigate('/rider')
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Spinner size="lg" /></div>

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-1">You've arrived!</h1>
          <p className="text-slate-400 text-sm">How was your ride?</p>
        </div>

        {/* Star Rating */}
        <Card className="p-6 mb-4">
          <p className="text-slate-400 text-sm text-center mb-4">Rate your driver</p>
          <div className="flex justify-center gap-3 mb-6">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setScore(s)}>
                <Star
                  className={`w-10 h-10 transition-all ${
                    s <= score ? 'text-amber-400 fill-amber-400 scale-110' : 'text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-white font-semibold mb-1">
            {score === 5 ? 'Excellent!' : score === 4 ? 'Great' : score === 3 ? 'Good' : score === 2 ? 'Fair' : 'Poor'}
          </p>

          <textarea
            className="w-full mt-4 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:border-amber-500 resize-none"
            placeholder="Leave a comment (optional)..."
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Card>

        <Button fullWidth size="lg" isLoading={isSubmitting} onClick={handleSubmit}>
          Submit Rating
        </Button>

        <button onClick={() => navigate('/rider')} className="w-full text-center text-slate-500 text-sm mt-3 py-2">
          Skip for now
        </button>
      </motion.div>
    </div>
  )
}

// ─── Rider Profile ────────────────────────────────────────────────────────────

export const RiderProfile = () => {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [rideStats, setRideStats] = useState({ total: 0, completed: 0 })

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('bookings')
      .select('status', { count: 'exact' })
      .eq('rider_id', profile.id)
      .then(({ data, count }) => {
        const completed = data?.filter(r => r.status === 'completed').length ?? 0
        setRideStats({ total: count ?? 0, completed })
      })
  }, [profile?.id])

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center pb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-3xl mb-3">
          {profile?.full_name?.[0] ?? 'U'}
        </div>
        <h2 className="text-xl font-bold text-white">{profile?.full_name}</h2>
        <Badge variant="amber">Rider</Badge>
      </div>

      {/* Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-400">{rideStats.total}</p>
            <p className="text-slate-400 text-sm">Total Rides</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{rideStats.completed}</p>
            <p className="text-slate-400 text-sm">Completed</p>
          </Card>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 mb-6">
        <Card className="divide-y divide-slate-700">
          {[
            { icon: User, label: 'Full Name', value: profile?.full_name },
            { icon: Mail, label: 'Email', value: profile?.email },
            { icon: Phone, label: 'Phone', value: profile?.phone ?? 'Not set' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-4">
              <Icon className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-slate-400 text-xs">{label}</p>
                <p className="text-white text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Sign Out */}
      <div className="px-4">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl py-3 font-medium"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <RiderBottomNav />
    </div>
  )
}
