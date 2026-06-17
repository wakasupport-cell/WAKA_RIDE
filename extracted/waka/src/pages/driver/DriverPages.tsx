import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, Star, Navigation, LogOut, User, Phone, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatSLL } from '@/lib/constants'
import { Card, Badge, Spinner, WakaLogo } from '@/components/ui'
import type { Booking, Driver } from '@/types'

// ─── Driver Earnings ──────────────────────────────────────────────────────────

export const DriverEarnings = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    const fetch = async () => {
      const { data: d } = await supabase.from('drivers').select('*').eq('profile_id', profile.id).single()
      if (!d) return
      setDriver(d as Driver)

      const { data: b } = await supabase
        .from('bookings')
        .select('*')
        .eq('driver_id', d.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(30)

      setBookings((b ?? []) as Booking[])
      setIsLoading(false)
    }
    fetch()
  }, [profile?.id])

  const totalEarnings = bookings.reduce((sum, b) => sum + b.fare_amount, 0)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayEarnings = bookings
    .filter(b => new Date(b.completed_at!) >= today)
    .reduce((sum, b) => sum + b.fare_amount, 0)

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7)
  const weekEarnings = bookings
    .filter(b => new Date(b.completed_at!) >= weekStart)
    .reduce((sum, b) => sum + b.fare_amount, 0)

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Spinner size="lg" /></div>

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="flex items-center gap-4 px-4 pt-12 pb-4">
        <button onClick={() => navigate('/driver')} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Earnings</h1>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Today', value: formatSLL(todayEarnings), color: 'text-green-400' },
            { label: 'This Week', value: formatSLL(weekEarnings), color: 'text-amber-400' },
            { label: 'All Time', value: formatSLL(totalEarnings), color: 'text-white' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-3 text-center">
              <p className={`font-bold text-sm ${color}`}>{value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {/* Driver Rating Card */}
        {driver && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs mb-1">Your Rating</p>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="text-white font-bold text-xl">{driver.average_rating.toFixed(1)}</span>
                  <span className="text-slate-500 text-sm">/ 5.0</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs mb-1">Total Trips</p>
                <p className="text-white font-bold text-xl">{driver.total_trips}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Trip History */}
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Recent Trips ({bookings.length})
          </p>
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No completed trips yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white text-sm font-medium truncate max-w-[200px]">
                          {b.pickup_address}
                        </p>
                        <p className="text-slate-500 text-xs">
                          → {b.destination_address}
                        </p>
                      </div>
                      <p className="text-amber-400 font-bold text-sm">{formatSLL(b.fare_amount)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-xs">{b.distance_km} km</span>
                      <span className="text-slate-500 text-xs">
                        {new Date(b.completed_at!).toLocaleDateString('en-SL', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Driver Profile ───────────────────────────────────────────────────────────

export const DriverProfile = () => {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [driver, setDriver] = useState<Driver | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('drivers').select('*').eq('profile_id', profile.id).single()
      .then(({ data }) => { if (data) setDriver(data as Driver) })
  }, [profile?.id])

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="flex items-center gap-4 px-4 pt-12 pb-4">
        <button onClick={() => navigate('/driver')} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">My Profile</h1>
      </div>

      <div className="flex flex-col items-center pb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-3xl mb-3">
          {profile?.full_name?.[0] ?? 'D'}
        </div>
        <h2 className="text-xl font-bold text-white">{profile?.full_name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={driver?.status === 'approved' ? 'green' : 'amber'}>
            {driver?.status === 'approved' ? 'Approved Driver' : driver?.status ?? 'Driver'}
          </Badge>
        </div>
      </div>

      {driver && (
        <div className="px-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-2xl font-bold text-white">{driver.average_rating.toFixed(1)}</span>
              </div>
              <p className="text-slate-400 text-sm">Rating</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{driver.total_trips}</p>
              <p className="text-slate-400 text-sm">Total Trips</p>
            </Card>
          </div>
        </div>
      )}

      <div className="px-4 mb-6">
        <Card className="divide-y divide-slate-700">
          {[
            { icon: User, label: 'Full Name', value: profile?.full_name },
            { icon: Mail, label: 'Email', value: profile?.email },
            { icon: Phone, label: 'Phone', value: profile?.phone ?? 'Not set' },
            { icon: Navigation, label: 'License No.', value: driver?.license_number ?? '—' },
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

      <div className="px-4">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl py-3 font-medium"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )
}
