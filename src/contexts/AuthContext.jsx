import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const isAdmin = () => user?.role === 'Admin'
  const canWrite = () => ['Admin', 'COO', 'Compliance Officer'].includes(user?.role)
  const isCompliance = () => ['Admin', 'COO', 'Compliance Officer'].includes(user?.role)

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAdmin, canWrite, isCompliance }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
