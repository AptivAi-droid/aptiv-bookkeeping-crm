import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a2e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-black text-2xl">A</span>
          </div>
          <h1 className="text-white text-2xl font-bold">Aptiv Bookkeeping CRM</h1>
          <p className="text-green-400 text-sm mt-1">Kenya Edition</p>
          <p className="text-green-600 text-xs mt-2">CBK · SASSRA · ICPAK · POCAMLA · 🇰🇪</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="admin@aptivcrm.co.ke"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">
            Aptiv Bookkeeping CRM v1.0 · Kenya
          </p>
        </div>
      </div>
    </div>
  )
}
