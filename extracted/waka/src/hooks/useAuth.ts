import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export const useAuth = () => {
  const store = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      store.setSession(session)
      store.setUser(session?.user ?? null)

      if (session?.user) {
        store.fetchProfile(session.user.id).finally(() => {
          store.setLoading(false)
          store.setInitialized(true)
        })
      } else {
        store.setLoading(false)
        store.setInitialized(true)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        store.setSession(session)
        store.setUser(session?.user ?? null)

        if (session?.user) {
          await store.fetchProfile(session.user.id)
        } else {
          store.setProfile(null)
        }

        store.setLoading(false)
        store.setInitialized(true)
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user: store.user,
    profile: store.profile,
    session: store.session,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    signOut: store.signOut,
    isAuthenticated: !!store.user,
    isRider: store.profile?.role === 'rider',
    isDriver: store.profile?.role === 'driver',
    isAdmin: store.profile?.role === 'admin',
  }
}
