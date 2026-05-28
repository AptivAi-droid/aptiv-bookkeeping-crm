import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase'

const AuthContext = createContext(null)

const DEMO_USER = {
  id:         'demo-admin',
  email:      'demo@aptivcrm.co.ke',
  first_name: 'Demo',
  last_name:  'Admin',
  role:       'Admin',
  status:     'Active',
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(SUPABASE_CONFIGURED ? null : DEMO_USER)
  const [loading, setLoading] = useState(SUPABASE_CONFIGURED)

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchUserProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchUserProfile(session.user.id)
      else { setUser(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(authId) {
    const { data, error } = await supabase
      .from('ab_users')
      .select('*')
      .eq('auth_user_id', authId)
      .maybeSingle()
    if (error) { console.error('[Auth] Failed to fetch user profile:', error.message); setUser(null) }
    else setUser(data || null)
    setLoading(false)
  }

  async function signIn(email, password) {
    if (!SUPABASE_CONFIGURED) { setUser(DEMO_USER); return }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    if (!SUPABASE_CONFIGURED) { setUser(null); return }
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[Auth] signOut error:', error.message)
  }

  const isAdmin      = () => user?.role === 'Admin'
  const canWrite     = () => ['Admin', 'COO', 'Compliance Officer'].includes(user?.role)
  const isCompliance = () => ['Admin', 'COO', 'Compliance Officer'].includes(user?.role)
  const isViewer     = () => user?.role === 'Viewer'

  return (
    <AuthContext.Provider value={{
      user, loading, SUPABASE_CONFIGURED,
      signIn, signOut,
      isAdmin, canWrite, isCompliance, isViewer,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
