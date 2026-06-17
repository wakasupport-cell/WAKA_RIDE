import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, Car, Clock, CheckCircle, TrendingUp, AlertTriangle,
  Navigation, Shield, Settings, CreditCard, LayoutDashboard
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatSLL } from '@/lib/constants'
import { Card, WakaLogo, Spinner, Badge } from '@/components/ui'
import type { DashboardStats } from '@/types'

const NAV_ITEMS = [
  { path: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { path: '/admin/drivers', icon: Car, label: 'Drivers' },
  { path: '/admin/bookings', icon: Navigation, label: 'Bookings' },
  { path: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/fare-settings', icon: Settings, label: 'Fares' },
]

export const AdminLayout = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const currentPath = window.location.pathname

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-900 border-r border-slate-800 fixed top-0 bottom-0">
        <div className="p-6 border-b border-slate-800">
          <WakaLogo size="md" />
          <div className="flex items-center gap-2 mt-3">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-xs font-semibold">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentPath === path
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
              {profile?.full_name?.[0]}
            </div>
            <div>
              <p className="text-white text-xs font-medium">{profile?.full_name}</p>
              <p className="text-slate-500 text-xs">Administrator</p>
            </div>
          </div>
          <button onClick={signOut} className="text-red-400 text-xs hover:text-red-300">Sign Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-60">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 pt-12 pb-4 border-b border-slate-800">
          <WakaLogo size="sm" />
          <Badge variant="amber">Admin</Badge>
        </div>

        {/* Page Header */}
        <div className="px-4 md:px-8 py-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </div>

        <div className="px-4 md:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 ${
                currentPath === path ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

const StatCard = ({
  icon: Icon, label, value, color, delta
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  delta?: string
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <Card className="p-4 md:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`}
          style={{ backgroundColor: color + '20' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {delta && <span className="text-green-400 text-xs font-medium">{delta}</span>}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-slate-400 text-sm">{label}</p>
    </Card>
  </motion.div>
)

export const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<{ id: string; pickup_address: string; fare_amount: number; status: string; created_at: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()

    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchStats())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchStats = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const [
      { count: totalRiders },
      { count: totalDrivers },
      { count: pendingDrivers },
      { count: approvedDrivers },
      { count: activeTrips },
      { data: completedToday },
      { data: recentB },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'rider'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'driver'),
      supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'driver_en_route', 'arrived', 'in_progress']),
      supabase.from('bookings').select('fare_amount').eq('status', 'completed').gte('completed_at', today.toISOString()),
      supabase.from('bookings').select('id, pickup_address, fare_amount, status, created_at').order('created_at', { ascending: false }).limit(5),
    ])

    const todayRevenue = (completedToday ?? []).reduce((sum: number, b: { fare_amount: number }) => sum + b.fare_amount, 0)

    setStats({
      total_riders: totalRiders ?? 0,
      total_drivers: totalDrivers ?? 0,
      pending_drivers: pendingDrivers ?? 0,
      approved_drivers: approvedDrivers ?? 0,
      active_trips: activeTrips ?? 0,
      completed_trips_today: (completedToday ?? []).length,
      total_revenue_today: todayRevenue,
      total_revenue_all_time: 0,
    })

    setRecentBookings((recentB ?? []) as typeof recentBookings)
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <AdminLayout title="Overview">
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Overview">
      <div className="space-y-6 pb-20 md:pb-0">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Total Riders" value={stats?.total_riders ?? 0} color="#F59E0B" />
          <StatCard icon={Car} label="Total Drivers" value={stats?.total_drivers ?? 0} color="#3B82F6" />
          <StatCard
            icon={Clock}
            label="Pending Approval"
            value={stats?.pending_drivers ?? 0}
            color={stats?.pending_drivers ? '#EF4444' : '#22C55E'}
            delta={stats?.pending_drivers ? 'Needs review' : undefined}
          />
          <StatCard icon={CheckCircle} label="Active Drivers" value={stats?.approved_drivers ?? 0} color="#22C55E" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard icon={Navigation} label="Live Trips" value={stats?.active_trips ?? 0} color="#8B5CF6" />
          <StatCard icon={TrendingUp} label="Trips Today" value={stats?.completed_trips_today ?? 0} color="#22C55E" />
          <StatCard icon={CreditCard} label="Revenue Today" value={formatSLL(stats?.total_revenue_today ?? 0)} color="#F59E0B" />
        </div>

        {/* Quick Actions */}
        {(stats?.pending_drivers ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => window.location.href = '/admin/drivers'}
              className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 hover:bg-amber-500/20 transition-colors"
            >
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div className="text-left">
                <p className="text-amber-400 font-semibold">
                  {stats?.pending_drivers} driver{stats?.pending_drivers !== 1 ? 's' : ''} pending approval
                </p>
                <p className="text-slate-400 text-sm">Tap to review applications</p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Recent Bookings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Recent Bookings</p>
            <button
              onClick={() => window.location.href = '/admin/bookings'}
              className="text-amber-400 text-xs hover:text-amber-300"
            >
              View all →
            </button>
          </div>
          <Card className="divide-y divide-slate-700">
            {recentBookings.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No bookings yet</div>
            ) : (
              recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-white text-sm font-medium truncate max-w-[180px]">{b.pickup_address}</p>
                    <p className="text-slate-500 text-xs">{new Date(b.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 text-sm font-semibold">{formatSLL(b.fare_amount)}</p>
                    <span className={`text-xs capitalize ${
                      b.status === 'completed' ? 'text-green-400' :
                      b.status === 'cancelled' ? 'text-red-400' : 'text-blue-400'
                    }`}>{b.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
