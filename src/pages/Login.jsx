import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Building2, Moon, Sun } from 'lucide-react'

export default function Login() {
  const { isDark, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-blue-600 dark:from-dark-bg dark:via-dark-card dark:to-dark-bg px-4 py-8 relative transition-colors duration-300">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-3 bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 backdrop-blur-sm rounded-xl transition-colors text-white z-20"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Glass Card */}
        <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-white/20 dark:border-dark-border p-8 md:p-10 rounded-2xl shadow-glow">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-2xl mb-6 shadow-soft">
              <Building2 size={40} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-4xl font-bold text-neutral-800 dark:text-dark-text mb-2">SiteLedger</h1>
            <p className="text-neutral-600 dark:text-dark-muted font-medium">Abhimanyu Tiling Works</p>
            <div className="w-16 h-1 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full mx-auto mt-4"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 dark:text-dark-text mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field bg-white dark:bg-dark-hover dark:border-dark-border dark:text-dark-text"
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 dark:text-dark-text mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field bg-white dark:bg-dark-hover dark:border-dark-border dark:text-dark-text"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-progress-pending/10 border-2 border-progress-pending text-progress-pending px-4 py-3 rounded-xl text-sm font-medium backdrop-blur-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-lg py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-neutral-200">
            <p className="text-center text-sm text-neutral-500">
              🔒 Single admin access only
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/80 mt-6 text-sm">
          Construction Execution & Billing System
        </p>
      </div>
    </div>
  )
}
