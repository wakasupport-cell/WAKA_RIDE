import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, Car } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, WakaLogo, Divider } from '@/components/ui'
import type { UserRole } from '@/types'

// ─── Register ─────────────────────────────────────────────────────────────────

export const RegisterPage = () => {
  const { isAuthenticated, profile } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<UserRole>('rider')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (isAuthenticated && profile) {
    return <Navigate to={getHomeRoute(profile.role)} replace />
  }

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role,
            phone: phone.trim() || null,
          },
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      })

      if (signUpError) throw signUpError
      setSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-slate-400 mb-6">
            We sent a verification link to <strong className="text-white">{email}</strong>.
            Click the link to activate your account.
          </p>
          <Button variant="outline" fullWidth onClick={() => navigate('/auth/login')}>
            Back to Login
          </Button>
        </motion.div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <WakaLogo size="lg" className="mb-2" />
        <p className="text-slate-400 mb-8 text-sm">Sierra Leone's ride platform</p>

        <h1 className="text-2xl font-bold text-white mb-6">Create account</h1>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['rider', 'driver'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`
                p-4 rounded-2xl border-2 transition-all duration-200 text-left
                ${role === r
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }
              `}
            >
              <div className="text-2xl mb-1">{r === 'rider' ? '🧍' : '🚗'}</div>
              <div className={`font-semibold text-sm capitalize ${role === r ? 'text-amber-400' : 'text-slate-300'}`}>
                {r === 'rider' ? 'I need a ride' : 'I drive'}
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Aminata Koroma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="076 123 456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button onClick={() => setShowPassword(!showPassword)} type="button">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={error}
          />
        </div>

        <Button
          fullWidth
          size="lg"
          className="mt-6"
          isLoading={isLoading}
          onClick={handleRegister}
          rightIcon={<ArrowRight className="w-5 h-5" />}
        >
          Create Account
        </Button>

        <Divider label="already have an account?" />

        <Link to="/auth/login">
          <Button variant="outline" fullWidth>
            Sign In
          </Button>
        </Link>
      </motion.div>
    </AuthShell>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────

export const LoginPage = () => {
  const { isAuthenticated, profile } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated && profile) {
    return <Navigate to={getHomeRoute(profile.role)} replace />
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) throw signInError

      const role = data.user?.user_metadata?.role ?? 'rider'
      navigate(getHomeRoute(role), { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed.'
      setError(
        message.includes('Invalid login') ? 'Invalid email or password.' : message
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <WakaLogo size="lg" className="mb-2" />
        <p className="text-slate-400 mb-8 text-sm">Sierra Leone's ride platform</p>

        <h1 className="text-2xl font-bold text-white mb-6">Welcome back</h1>

        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button onClick={() => setShowPassword(!showPassword)} type="button">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={error}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div className="flex justify-end mt-2 mb-6">
          <Link to="/auth/forgot-password" className="text-sm text-amber-400 hover:text-amber-300">
            Forgot password?
          </Link>
        </div>

        <Button fullWidth size="lg" isLoading={isLoading} onClick={handleLogin}>
          Sign In
        </Button>

        <Divider label="new to WAKA?" />

        <Link to="/auth/register">
          <Button variant="outline" fullWidth leftIcon={<Car className="w-4 h-4" />}>
            Create Account
          </Button>
        </Link>
      </motion.div>
    </AuthShell>
  )
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/reset-password` }
      )
      if (resetError) throw resetError
      setSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reset failed.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Email sent</h2>
            <p className="text-slate-400 mb-6">
              Check <strong className="text-white">{email}</strong> for a password reset link.
            </p>
            <Link to="/auth/login">
              <Button variant="outline" fullWidth>Back to Login</Button>
            </Link>
          </div>
        ) : (
          <>
            <WakaLogo size="lg" className="mb-8" />
            <h1 className="text-2xl font-bold text-white mb-2">Reset password</h1>
            <p className="text-slate-400 mb-6 text-sm">
              Enter your email and we'll send you a reset link.
            </p>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              error={error}
            />
            <Button fullWidth size="lg" className="mt-6" isLoading={isLoading} onClick={handleReset}>
              Send Reset Link
            </Button>
            <div className="mt-4 text-center">
              <Link to="/auth/login" className="text-sm text-slate-400 hover:text-white">
                ← Back to Login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </AuthShell>
  )
}

// ─── Shared Auth Shell ────────────────────────────────────────────────────────

const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-slate-900 flex flex-col">
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </div>
    </div>
    <div className="pb-8 text-center text-xs text-slate-600">
      WAKA · Sierra Leone · {new Date().getFullYear()}
    </div>
  </div>
)

// ─── Route Helper ─────────────────────────────────────────────────────────────

export const getHomeRoute = (role: string): string => {
  switch (role) {
    case 'admin': return '/admin'
    case 'driver': return '/driver'
    default: return '/rider'
  }
}
