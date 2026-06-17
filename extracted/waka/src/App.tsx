import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ProtectedRoute, GuestRoute, SuspendedPage } from '@/components/auth/ProtectedRoute'
import { Spinner } from '@/components/ui'

// Auth
import { LoginPage, RegisterPage, ForgotPasswordPage } from '@/pages/auth/AuthPages'

// Rider
const RiderHome = lazy(() => import('@/pages/rider/RiderHome').then(m => ({ default: m.RiderHome })))
const BookingFlow = lazy(() => import('@/pages/rider/BookingFlow').then(m => ({ default: m.BookingFlow })))
const ActiveRide = lazy(() => import('@/pages/rider/ActiveRide').then(m => ({ default: m.ActiveRide })))
const MyRides = lazy(() => import('@/pages/rider/MyRides').then(m => ({ default: m.MyRides })))
const RideDetail = lazy(() => import('@/pages/rider/RideDetail').then(m => ({ default: m.RideDetail })))
const RiderProfile = lazy(() => import('@/pages/rider/RiderProfile').then(m => ({ default: m.RiderProfile })))
const PaymentPage = lazy(() => import('@/pages/rider/PaymentPage').then(m => ({ default: m.PaymentPage })))
const RatePage = lazy(() => import('@/pages/rider/RatePage').then(m => ({ default: m.RatePage })))

// Driver
const DriverOnboarding = lazy(() => import('@/pages/driver/DriverOnboarding').then(m => ({ default: m.DriverOnboarding })))
const DriverDashboard = lazy(() => import('@/pages/driver/DriverDashboard').then(m => ({ default: m.DriverDashboard })))
const DriverTrip = lazy(() => import('@/pages/driver/DriverTrip').then(m => ({ default: m.DriverTrip })))
const DriverEarnings = lazy(() => import('@/pages/driver/DriverEarnings').then(m => ({ default: m.DriverEarnings })))
const DriverProfile = lazy(() => import('@/pages/driver/DriverProfile').then(m => ({ default: m.DriverProfile })))

// Admin
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminDrivers = lazy(() => import('@/pages/admin/AdminDrivers').then(m => ({ default: m.AdminDrivers })))
const AdminDriverDetail = lazy(() => import('@/pages/admin/AdminDriverDetail').then(m => ({ default: m.AdminDriverDetail })))
const AdminBookings = lazy(() => import('@/pages/admin/AdminBookings').then(m => ({ default: m.AdminBookings })))
const AdminPayments = lazy(() => import('@/pages/admin/AdminPayments').then(m => ({ default: m.AdminPayments })))
const AdminFareSettings = lazy(() => import('@/pages/admin/AdminFareSettings').then(m => ({ default: m.AdminFareSettings })))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })))

const PageLoader = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <Spinner size="lg" />
  </div>
)

export const App = () => {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/auth/login" replace />} />

            {/* Auth routes — guests only */}
            <Route element={<GuestRoute />}>
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Misc auth */}
            <Route path="/auth/suspended" element={<SuspendedPage />} />

            {/* ─── RIDER ROUTES ─────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['rider']} />}>
              <Route path="/rider" element={<RiderHome />} />
              <Route path="/rider/book" element={<BookingFlow />} />
              <Route path="/rider/ride/:id" element={<ActiveRide />} />
              <Route path="/rider/rides" element={<MyRides />} />
              <Route path="/rider/rides/:id" element={<RideDetail />} />
              <Route path="/rider/payment/:bookingId" element={<PaymentPage />} />
              <Route path="/rider/rate/:bookingId" element={<RatePage />} />
              <Route path="/rider/profile" element={<RiderProfile />} />
            </Route>

            {/* ─── DRIVER ROUTES ────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['driver']} />}>
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/driver/onboarding" element={<DriverOnboarding />} />
              <Route path="/driver/trip/:id" element={<DriverTrip />} />
              <Route path="/driver/earnings" element={<DriverEarnings />} />
              <Route path="/driver/profile" element={<DriverProfile />} />
            </Route>

            {/* ─── ADMIN ROUTES ─────────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/drivers" element={<AdminDrivers />} />
              <Route path="/admin/drivers/:id" element={<AdminDriverDetail />} />
              <Route path="/admin/bookings" element={<AdminBookings />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/fare-settings" element={<AdminFareSettings />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/auth/login" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </BrowserRouter>
  )
}
