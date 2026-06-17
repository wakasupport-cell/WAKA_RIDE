import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean

  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      isLoading: true,
      isInitialized: false,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),

      fetchProfile: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

          if (error) throw error
          set({ profile: data })
        } catch (err) {
          console.error('Failed to fetch profile:', err)
          set({ profile: null })
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        get().reset()
      },

      reset: () =>
        set({
          user: null,
          profile: null,
          session: null,
          isLoading: false,
        }),
    }),
    {
      name: 'waka-auth',
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
)
