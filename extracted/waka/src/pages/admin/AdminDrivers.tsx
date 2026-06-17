import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, CheckCircle, XCircle, AlertTriangle, Star, ChevronRight, ArrowLeft, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { AdminLayout } from './AdminDashboard'
import { Button, Card, Badge, Spinner, BookingStatusBadge } from '@/components/ui'
import type { Driver, Profile, DriverStatus } from '@/types'

interface DriverWithProfile extends Driver {
  profile: Profile
}

// ─── Admin Drivers List ───────────────────────────────────────────────────────

export const AdminDrivers = () => {
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DriverStatus | 'all'>('all')

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    const { data } = await supabase
      .from('drivers')
      .select(`
        *,
        profile:profiles(*)
      `)
      .order('created_at', { ascending: false })

    setDrivers((data ?? []) as unknown as DriverWithProfile[])
    setIsLoading(false)
  }

  const filtered = drivers.filter((d) => {
    const matchesSearch =
      !search ||
      d.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      d.license_number?.toLowerCase().includes(search.toLowerCase())

    const matchesFilter = filter === 'all' || d.status === filter
    return matchesSearch && matchesFilter
  })

  const statusColors: Record<string, 'amber' | 'green' | 'red' | 'gray'> = {
    pending_approval: 'amber',
    approved: 'green',
    rejected: 'red',
    suspended: 'gray',
  }

  const filterOptions: { key: DriverStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending_approval', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'suspended', label: 'Suspended' },
  ]

  return (
    <AdminLayout title="Driver Management">
      <div className="space-y-4 pb-20 md:pb-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-slate-500 outline-none focus:border-amber-500"
            placeholder="Search by name, email, license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {label}
              {key !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({drivers.filter(d => d.status === key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No drivers found</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((driver, i) => (
              <motion.div
                key={driver.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  className="p-4"
                  hoverable
                  onClick={() => navigate(`/admin/drivers/${driver.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {driver.profile?.full_name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">{driver.profile?.full_name}</p>
                      <p className="text-slate-400 text-xs truncate">{driver.profile?.email}</p>
                      <p className="text-slate-500 text-xs">License: {driver.license_number}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={statusColors[driver.status] ?? 'gray'}>
                        {driver.status.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-slate-400 text-xs">{driver.average_rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// ─── Admin Driver Detail ──────────────────────────────────────────────────────

export const AdminDriverDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile: adminProfile } = useAuth()

  const [driver, setDriver] = useState<DriverWithProfile | null>(null)
  const [vehicle, setVehicle] = useState<{ make: string; model: string; year: number; color: string; plate_number: string; vehicle_type: string } | null>(null)
  const [notes, setNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      const { data: d } = await supabase
        .from('drivers')
        .select('*, profile:profiles(*)')
        .eq('id', id)
        .single()

      if (d) {
        setDriver(d as unknown as DriverWithProfile)
        setNotes(d.approval_notes ?? '')
      }

      const { data: v } = await supabase
        .from('vehicles')
        .select('*')
        .eq('driver_id', id)
        .single()

      if (v) setVehicle(v as typeof vehicle)
      setIsLoading(false)
    }
    fetch()
  }, [id])

  const updateStatus = async (status: DriverStatus) => {
    if (!driver || !adminProfile) return
    setIsUpdating(true)

    await supabase.from('drivers').update({
      status,
      approval_notes: notes,
      approved_by: status === 'approved' ? adminProfile.id : null,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
    }).eq('id', driver.id)

    // Notify driver
    await supabase.from('notifications').insert({
      user_id: driver.profile_id,
      type: status === 'approved' ? 'driver_approved' : status === 'rejected' ? 'driver_rejected' : 'driver_suspended',
      title: status === 'approved' ? 'Application Approved!' : status === 'rejected' ? 'Application Rejected' : 'Account Suspended',
      body: notes || (status === 'approved'
        ? 'Your driver application has been approved. You can now start accepting rides.'
        : status === 'rejected'
        ? 'Your application was not approved. Please contact support for details.'
        : 'Your account has been suspended. Please contact support.'),
      data: { driver_id: driver.id },
    })

    setDriver((prev) => prev ? { ...prev, status } : null)
    setIsUpdating(false)
  }

  if (isLoading) return (
    <AdminLayout title="Driver Details">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </AdminLayout>
  )

  if (!driver) return null

  return (
    <AdminLayout title="Driver Details">
      <div className="max-w-2xl space-y-4 pb-20 md:pb-0">
        {/* Back */}
        <button
          onClick={() => navigate('/admin/drivers')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Drivers
        </button>

        {/* Header */}
        <Card className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-2xl">
              {driver.profile?.full_name?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{driver.profile?.full_name}</h2>
              <p className="text-slate-400 text-sm">{driver.profile?.email}</p>
              <Badge variant={
                driver.status === 'approved' ? 'green' :
                driver.status === 'pending_approval' ? 'amber' :
                driver.status === 'rejected' ? 'red' : 'gray'
              } size="md">
                {driver.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center border-t border-slate-700 pt-4">
            <div>
              <div className="flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-white font-bold">{driver.average_rating.toFixed(1)}</span>
              </div>
              <p className="text-slate-500 text-xs">Rating</p>
            </div>
            <div>
              <p className="text-white font-bold">{driver.total_trips}</p>
              <p className="text-slate-500 text-xs">Trips</p>
            </div>
            <div>
              <p className="text-white font-bold">{driver.profile?.phone ?? '—'}</p>
              <p className="text-slate-500 text-xs">Phone</p>
            </div>
          </div>
        </Card>

        {/* Documents */}
        <Card className="p-4">
          <h3 className="text-white font-semibold mb-3">Documents</h3>
          <div className="space-y-3">
            {[
              { label: 'License Number', value: driver.license_number },
              { label: 'National ID', value: driver.national_id_number },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span className="text-white font-mono">{value}</span>
              </div>
            ))}

            {/* Document links */}
            {[
              { label: 'Driver License', url: driver.license_doc_url },
              { label: 'National ID', url: driver.national_id_doc_url },
              { label: 'Driver Photo', url: driver.driver_photo_url },
            ].map(({ label, url }) => (
              url && (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-sm p-2 bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  <span className="text-slate-300">{label}</span>
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    <Eye className="w-3 h-3" /> View
                  </div>
                </a>
              )
            ))}
          </div>
        </Card>

        {/* Vehicle */}
        {vehicle && (
          <Card className="p-4">
            <h3 className="text-white font-semibold mb-3">Vehicle</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Type', value: vehicle.vehicle_type },
                { label: 'Make', value: vehicle.make },
                { label: 'Model', value: vehicle.model },
                { label: 'Year', value: vehicle.year },
                { label: 'Color', value: vehicle.color },
                { label: 'Plate', value: vehicle.plate_number },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-slate-500 text-xs">{label}</p>
                  <p className="text-white font-medium capitalize">{String(value)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Admin Notes */}
        <Card className="p-4">
          <h3 className="text-white font-semibold mb-3">Admin Notes</h3>
          <textarea
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:border-amber-500 resize-none"
            placeholder="Add notes about this driver (visible to driver on rejection)..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Card>

        {/* Action Buttons */}
        <div className="space-y-2">
          {driver.status !== 'approved' && (
            <Button
              fullWidth
              size="lg"
              isLoading={isUpdating}
              onClick={() => updateStatus('approved')}
              leftIcon={<CheckCircle className="w-5 h-5" />}
            >
              Approve Driver
            </Button>
          )}

          {driver.status !== 'rejected' && driver.status !== 'approved' && (
            <Button
              variant="danger"
              fullWidth
              isLoading={isUpdating}
              onClick={() => updateStatus('rejected')}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Reject Application
            </Button>
          )}

          {driver.status === 'approved' && (
            <Button
              variant="danger"
              fullWidth
              isLoading={isUpdating}
              onClick={() => updateStatus('suspended')}
              leftIcon={<AlertTriangle className="w-4 h-4" />}
            >
              Suspend Driver
            </Button>
          )}

          {driver.status === 'suspended' && (
            <Button
              variant="secondary"
              fullWidth
              isLoading={isUpdating}
              onClick={() => updateStatus('approved')}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Reinstate Driver
            </Button>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
