import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading,
      leftIcon,
      rightIcon,
      fullWidth,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none'

    const variants = {
      primary:
        'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:brightness-110',
      secondary:
        'bg-slate-700 text-white hover:bg-slate-600',
      ghost:
        'text-slate-300 hover:bg-slate-800 hover:text-white',
      danger:
        'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/25',
      outline:
        'border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-400',
    }

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-12 px-6 text-base',
      lg: 'h-14 px-8 text-lg',
    }

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        disabled={disabled || isLoading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...(props as object)}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full h-13 bg-slate-800 border rounded-2xl
              text-white placeholder-slate-500
              transition-all duration-200 outline-none
              ${leftIcon ? 'pl-12' : 'pl-4'}
              ${rightIcon ? 'pr-12' : 'pr-4'}
              py-3
              ${error
                ? 'border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                : 'border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
              }
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export const Card = ({ children, className = '', onClick, hoverable }: CardProps) => (
  <motion.div
    onClick={onClick}
    whileHover={hoverable ? { scale: 1.01 } : undefined}
    whileTap={onClick ? { scale: 0.99 } : undefined}
    className={`bg-slate-800 rounded-2xl border border-slate-700 ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </motion.div>
)

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode
  variant?: 'amber' | 'green' | 'red' | 'blue' | 'purple' | 'gray'
  size?: 'sm' | 'md'
}

const badgeVariants = {
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  gray: 'bg-slate-600/50 text-slate-400 border-slate-600',
}

export const Badge = ({ children, variant = 'gray', size = 'sm' }: BadgeProps) => (
  <span
    className={`
      inline-flex items-center border rounded-full font-medium
      ${badgeVariants[variant]}
      ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
    `}
  >
    {children}
  </span>
)

// ─── Spinner ──────────────────────────────────────────────────────────────────

export const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <Loader2 className={`${sizes[size]} animate-spin text-amber-500`} />
  )
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

export const WakaLogo = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) => {
  const sizes = { sm: 'text-xl', md: 'text-3xl', lg: 'text-5xl' }
  return (
    <div className={`font-black tracking-tight ${sizes[size]} ${className}`}>
      <span className="text-white">wak</span>
      <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">A</span>
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export const Divider = ({ label }: { label?: string }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-slate-700" />
    {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
    <div className="flex-1 h-px bg-slate-700" />
  </div>
)

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-6 text-center"
  >
    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <p className="text-slate-400 text-sm mb-6 max-w-xs">{description}</p>
    {action}
  </motion.div>
)

// ─── Status Badge ─────────────────────────────────────────────────────────────

const bookingStatusMap = {
  pending: { label: 'Looking for driver', variant: 'amber' as const },
  accepted: { label: 'Driver assigned', variant: 'blue' as const },
  driver_en_route: { label: 'Driver en route', variant: 'blue' as const },
  arrived: { label: 'Driver arrived', variant: 'green' as const },
  in_progress: { label: 'In progress', variant: 'green' as const },
  completed: { label: 'Completed', variant: 'gray' as const },
  cancelled: { label: 'Cancelled', variant: 'red' as const },
}

export const BookingStatusBadge = ({ status }: { status: string }) => {
  const config = bookingStatusMap[status as keyof typeof bookingStatusMap] ?? {
    label: status,
    variant: 'gray' as const,
  }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ─── Page Shell ───────────────────────────────────────────────────────────────

export const PageShell = ({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className={`min-h-screen bg-slate-900 text-white ${className}`}
  >
    {children}
  </motion.div>
)
