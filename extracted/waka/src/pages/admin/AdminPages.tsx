import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, CheckCircle, Clock, Filter, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { AdminLayout } from './AdminDashboard'
import { Card, Badge, Spinner, BookingStatusBadge, Button } from '@/components/ui'
import { formatSLL } from '@/lib/constants'
import type { Booking, Payment, FareSettings, Profile, VehicleType } from '@/types'

// ─── Admin Bookings ───────────────────────────────────────────────────────────

interface BookingWithProfiles extends Booking {
  rider: Pick<Profile, 'full_name' | 'email'>
}

export const AdminBookings = () => {
  const [bookings, setBookings] = useState<BookingWithProfiles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchBookings()

    const channel = supabase
      .channel('admin-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchBookings())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        rider:profiles!bookings_rider_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    setBookings((data ?? []) as unknown as BookingWithProfiles[])
    setIsLoading(false)
  }

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      !search ||
      b.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
      b.destination_address.toLowerCase().includes(search.toLowerCase()) ||
      b.rider?.full_name?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statuses = ['all', 'pending', 'accepted', 'driver_en_route', 'arrived', 'in_progress', 'completed', 'cancelled']

  return (
    <AdminLayout title="Bookings">
      <div className="space-y-4 pb-20 md:pb-0">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-amber-500 text-sm"
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={fetchBookings}
            className="w-11 h-11 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 hover:border-amber-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-slate-400 text-xs">Live updates enabled</span>
          <span className="text-slate-600 text-xs ml-auto">{filtered.length} bookings</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((booking, i) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-white text-sm font-medium truncate">
                        {booking.rider?.full_name ?? 'Unknown Rider'}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {new Date(booking.created_at).toLocaleString('en-SL', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <BookingStatusBadge status={booking.status} />
                      <span className="text-amber-400 text-sm font-bold">
                        {formatSLL(booking.fare_amount)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="text-slate-400 truncate">{booking.pickup_address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                      <span className="text-slate-400 truncate">{booking.destination_address}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-700 text-xs text-slate-500">
                    <span>{booking.distance_km} km</span>
                    <span>·</span>
                    <span className="capitalize">{booking.vehicle_type}</span>
                    <span>·</span>
                    <span className={
                      booking.payment_status === 'confirmed' ? 'text-green-400' :
                      booking.payment_status === 'submitted' ? 'text-amber-400' : 'text-slate-500'
                    }>
                      Payment: {booking.payment_status}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-500">No bookings found</div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ─── Admin Payments ───────────────────────────────────────────────────────────

interface PaymentWithBooking extends Payment {
  booking: Pick<Booking, 'pickup_address' | 'destination_address' | 'fare_amount' | 'rider_id'>
}

export const AdminPayments = () => {
  const { profile } = useAuth()
  const [payments, setPayments] = useState<PaymentWithBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'submitted' | 'confirmed' | 'pending'>('submitted')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings(pickup_address, destination_address, fare_amount, rider_id)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    setPayments((data ?? []) as unknown as PaymentWithBooking[])
    setIsLoading(false)
  }

  const handleConfirm = async (payment: PaymentWithBooking) => {
    if (!profile) return
    setConfirmingId(payment.id)

    await supabase.from('payments').update({
      status: 'confirmed',
      confirmed_by: profile.id,
      confirmed_at: new Date().toISOString(),
    }).eq('id', payment.id)

    await supabase.from('bookings').update({
      payment_status: 'confirmed',
    }).eq('id', payment.booking_id)

    setPayments((prev) =>
      prev.map((p) => p.id === payment.id ? { ...p, status: 'confirmed' } : p)
    )
    setConfirmingId(null)
  }

  const handleReject = async (payment: PaymentWithBooking) => {
    setConfirmingId(payment.id)

    await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id)
    await supabase.from('bookings').update({ payment_status: 'failed' }).eq('id', payment.booking_id)

    setPayments((prev) =>
      prev.map((p) => p.id === payment.id ? { ...p, status: 'failed' } : p)
    )
    setConfirmingId(null)
  }

  const filtered = payments.filter((p) =>
    filter === 'all' || p.status === filter
  )

  const pendingCount = payments.filter((p) => p.status === 'submitted').length

  const methodLabels: Record<string, string> = {
    orange_money: '🟠 Orange Money',
    afri_money: '🔵 Afri Money',
    q_money: '🟣 Q Money',
  }

  return (
    <AdminLayout title="Payment Verification">
      <div className="space-y-4 pb-20 md:pb-0">
        {pendingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-amber-400 font-semibold text-sm">
                {pendingCount} payment{pendingCount !== 1 ? 's' : ''} awaiting confirmation
              </p>
              <p className="text-slate-400 text-xs">Review and confirm rider payment submissions</p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'submitted', label: 'Pending Review' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'pending', label: 'Not Submitted' },
            { key: 'all', label: 'All' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                filter === key ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No payments found</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((payment, i) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-bold text-lg">{formatSLL(payment.amount)}</p>
                      <p className="text-slate-400 text-sm">{methodLabels[payment.payment_method] ?? payment.payment_method}</p>
                    </div>
                    <Badge variant={
                      payment.status === 'confirmed' ? 'green' :
                      payment.status === 'submitted' ? 'amber' :
                      payment.status === 'failed' ? 'red' : 'gray'
                    }>
                      {payment.status}
                    </Badge>
                  </div>

                  {payment.booking && (
                    <div className="text-xs text-slate-400 mb-3 space-y-1">
                      <p className="truncate">📍 {payment.booking.pickup_address}</p>
                      <p className="truncate">🏁 {payment.booking.destination_address}</p>
                    </div>
                  )}

                  {payment.reference_code && (
                    <div className="bg-slate-900 rounded-xl px-3 py-2 mb-3">
                      <p className="text-slate-500 text-xs mb-0.5">Reference Code</p>
                      <p className="text-white font-mono text-sm">{payment.reference_code}</p>
                    </div>
                  )}

                  <p className="text-slate-600 text-xs mb-3">
                    {new Date(payment.created_at).toLocaleString()}
                  </p>

                  {payment.status === 'submitted' && (
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        fullWidth
                        isLoading={confirmingId === payment.id}
                        onClick={() => handleReject(payment)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        fullWidth
                        isLoading={confirmingId === payment.id}
                        onClick={() => handleConfirm(payment)}
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                      >
                        Confirm
                      </Button>
                    </div>
                  )}

                  {payment.status === 'confirmed' && payment.confirmed_at && (
                    <p className="text-green-400 text-xs flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Confirmed {new Date(payment.confirmed_at).toLocaleString()}
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ─── Admin Fare Settings ──────────────────────────────────────────────────────

export const AdminFareSettings = () => {
  const { profile } = useAuth()
  const [fares, setFares] = useState<FareSettings[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<FareSettings>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('fare_settings').select('*').order('vehicle_type')
      .then(({ data }) => {
        setFares((data ?? []) as FareSettings[])
        setIsLoading(false)
      })
  }, [])

  const startEdit = (fare: FareSettings) => {
    setEditing(fare.id)
    setEditValues({
      base_fare: fare.base_fare,
      per_km_rate: fare.per_km_rate,
      minimum_fare: fare.minimum_fare,
      surge_multiplier: fare.surge_multiplier,
    })
  }

  const handleSave = async (fareId: string) => {
    if (!profile) return
    setIsSaving(true)

    await supabase.from('fare_settings').update({
      ...editValues,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }).eq('id', fareId)

    setFares((prev) =>
      prev.map((f) => f.id === fareId ? { ...f, ...editValues } as FareSettings : f)
    )
    setEditing(null)
    setSavedId(fareId)
    setTimeout(() => setSavedId(null), 2000)
    setIsSaving(false)
  }

  const vehicleEmojis: Record<VehicleType, string> = { keke: '🛺', taxi: '🚕', premium: '🚙' }

  if (isLoading) return (
    <AdminLayout title="Fare Settings">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </AdminLayout>
  )

  return (
    <AdminLayout title="Fare Settings">
      <div className="space-y-4 max-w-xl pb-20 md:pb-0">
        <p className="text-slate-400 text-sm">
          Adjust fares per vehicle type. Changes take effect immediately for all new bookings.
        </p>

        {fares.map((fare) => {
          const isEditing = editing === fare.id
          const isSaved = savedId === fare.id

          return (
            <motion.div key={fare.id} layout>
              <Card className={`p-4 transition-all ${isSaved ? 'border-green-500/50' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{vehicleEmojis[fare.vehicle_type]}</span>
                    <div>
                      <h3 className="text-white font-semibold capitalize">{fare.vehicle_type}</h3>
                      {isSaved && (
                        <span className="text-green-400 text-xs flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Saved
                        </span>
                      )}
                    </div>
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => startEdit(fare)}
                      className="text-amber-400 text-sm font-medium hover:text-amber-300"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditing(null)}
                      className="text-slate-400 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'base_fare', label: 'Base Fare (SLL)' },
                    { key: 'per_km_rate', label: 'Per KM Rate (SLL)' },
                    { key: 'minimum_fare', label: 'Minimum Fare (SLL)' },
                    { key: 'surge_multiplier', label: 'Surge Multiplier (×)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <p className="text-slate-500 text-xs mb-1">{label}</p>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500"
                          value={editValues[key as keyof typeof editValues] ?? ''}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [key]: parseFloat(e.target.value),
                            }))
                          }
                        />
                      ) : (
                        <p className="text-white font-semibold text-sm">
                          {key === 'surge_multiplier'
                            ? `×${fare[key as keyof FareSettings]}`
                            : formatSLL(Number(fare[key as keyof FareSettings]))}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <Button
                    fullWidth
                    className="mt-4"
                    isLoading={isSaving}
                    onClick={() => handleSave(fare.id)}
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                  >
                    Save Changes
                  </Button>
                )}

                {!isEditing && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-slate-500 text-xs">
                      Example: 10 km trip = {formatSLL(Math.max(fare.base_fare + 10 * fare.per_km_rate, fare.minimum_fare))}
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>
    </AdminLayout>
  )
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

export const AdminUsers = () => {
  const [users, setUsers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'rider' | 'driver' | 'admin'>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        setUsers((data ?? []) as Profile[])
        setIsLoading(false)
      })
  }, [])

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const toggleActive = async (user: Profile) => {
    setTogglingId(user.id)
    await supabase
      .from('profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)

    setUsers((prev) =>
      prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u)
    )
    setTogglingId(null)
  }

  return (
    <AdminLayout title="User Management">
      <div className="space-y-4 pb-20 md:pb-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-amber-500 text-sm"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {['all', 'rider', 'driver', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r as typeof roleFilter)}
              className={`px-4 py-2 rounded-full text-xs font-medium capitalize transition-all ${
                roleFilter === r ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <p className="text-slate-600 text-xs">{filtered.length} users</p>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {user.full_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{user.full_name}</p>
                      <p className="text-slate-400 text-xs truncate">{user.email}</p>
                      <p className="text-slate-600 text-xs">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={
                        user.role === 'admin' ? 'purple' :
                        user.role === 'driver' ? 'blue' : 'gray'
                      }>
                        {user.role}
                      </Badge>
                      <button
                        onClick={() => toggleActive(user)}
                        disabled={togglingId === user.id || user.role === 'admin'}
                        className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                          user.is_active
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                      >
                        {togglingId === user.id ? '...' : user.is_active ? 'Suspend' : 'Restore'}
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-500">No users found</div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
