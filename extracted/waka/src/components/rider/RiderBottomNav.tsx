import { useLocation, useNavigate } from 'react-router-dom'
import { Home, List, User } from 'lucide-react'

const navItems = [
  { path: '/rider', icon: Home, label: 'Home' },
  { path: '/rider/rides', icon: List, label: 'My Rides' },
  { path: '/rider/profile', icon: User, label: 'Profile' },
]

export const RiderBottomNav = () => {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 flex-1 py-2"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-amber-400' : 'text-slate-500'
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors ${
                  isActive ? 'text-amber-400' : 'text-slate-500'
                }`}
              >
                {label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
