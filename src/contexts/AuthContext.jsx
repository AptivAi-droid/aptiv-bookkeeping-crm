import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase'

const AuthContext = createContext(null)

// Demo admin user — used when Supabase is not configured
const DEMO_USER = {
  id: 'demo-admin',
  email: 'admin@aptivcrm.co.ke',
  first_name: 'Neal',
  last_name: 'Titus',
  role: 'Admin',
  status: 'Active',
}

export function AuthProvider({ children }) {
  // In demo mode (no Supabase), start logged in as demo admin
  const [user, setUser] = useState(SUPABASE_CONFIGURED ? null : DEMO_USER)
  const [loading, setLoading] = useState(SUPABASE_CONFIGURED)

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return // demo mode — skip Supabase entirely

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(authId) {
    const { data } = await supabase
      .from('ab_users')
      .select('*')
      .eq('auth_user_id', authId)
      .single()
    setUser(data || null)
    setLoading(false)
  }

  async function signIn(email, password) {
    if (!SUPABASE_CONFIGURED) {
      // Demo mode — accept any credentials, log in as demo admin
      setUser(DEMO_USER)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    if (!SUPABASE_CONFIGURED) {
      setUser(null)
      return
    }
    await supabase.auth.signOut()
  }

  const isAdmin = () => user?.role === 'Admin'
  const canWrite = () => ['Admin', 'COO', 'Compliance Officer'].includes(user?.role)
  const isCompliance = () => ['Admin', 'COO', 'Compliance Officer'].includes(user?.role)

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAdmin, canWrite, isCompliance, SUPABASE_CONFIGURED }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
