import { Navigate, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { WakaLogo, Spinner } from '@/components/ui'
import type { UserRole } from '@/types'

// ─── Loading Screen ───────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <WakaLogo size="lg" />
    </motion.div>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <Spinner size="md" />
    </motion.div>
  </div>
)

// ─── Protected Route ──────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export const ProtectedRoute = ({
  allowedRoles,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) => {
  const { isAuthenticated, isInitialized, profile } = useAuth()

  if (!isInitialized) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  // Check role access
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate home
    const homeRoutes: Record<UserRole, string> = {
      rider: '/rider',
      driver: '/driver',
      admin: '/admin',
    }
    return <Navigate to={homeRoutes[profile.role]} replace />
  }

  // Check if account is active
  if (profile && !profile.is_active) {
    return <Navigate to="/auth/suspended" replace />
  }

  return <Outlet />
}

// ─── Guest Only Route (auth pages) ────────────────────────────────────────────

export const GuestRoute = () => {
  const { isAuthenticated, isInitialized, profile } = useAuth()

  if (!isInitialized) {
    return <LoadingScreen />
  }

  if (isAuthenticated && profile) {
    const homeRoutes: Record<UserRole, string> = {
      rider: '/rider',
      driver: '/driver',
      admin: '/admin',
    }
    return <Navigate to={homeRoutes[profile.role]} replace />
  }

  return <Outlet />
}

// ─── Suspended Screen ─────────────────────────────────────────────────────────

export const SuspendedPage = () => {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Account Suspended</h2>
        <p className="text-slate-400 mb-6 text-sm">
          Your account has been suspended. Please contact WAKA support for assistance.
        </p>
        <button
          onClick={signOut}
          className="text-amber-400 hover:text-amber-300 text-sm font-medium"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
