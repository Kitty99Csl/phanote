import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password)
        setError('Check your email to confirm your account!')
      } else {
        await signIn(email, password)
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
            🐾
          </div>
          <h1 className="text-3xl font-bold font-display" style={{ color: 'var(--color-accent-dk)' }}>
            Phanote
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-sub)' }}>
            ພາໂນດ · พาโนด · Your financial companion
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-5 py-3.5 rounded-2xl text-sm outline-none transition-shadow"
              style={{
                background: 'var(--color-card)',
                boxShadow: '0 2px 16px rgba(40,90,40,0.08)',
                color: 'var(--color-text)',
                border: 'none',
              }}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-5 py-3.5 rounded-2xl text-sm outline-none transition-shadow"
              style={{
                background: 'var(--color-card)',
                boxShadow: '0 2px 16px rgba(40,90,40,0.08)',
                color: 'var(--color-text)',
                border: 'none',
              }}
            />
          </div>

          {error && (
            <p className="text-xs text-center px-2 py-2 rounded-xl"
              style={{
                background: error.includes('Check your email') ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
                color: error.includes('Check your email') ? 'var(--color-income)' : 'var(--color-expense)',
              }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full text-white font-bold text-sm transition-transform active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, var(--color-accent), var(--color-accent-dk))`,
              boxShadow: '0 4px 20px rgba(40,90,40,0.2)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '...' : isSignUp ? 'Create Account' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-sub)' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="ml-1 font-bold underline"
            style={{ color: 'var(--color-accent-dk)', background: 'none', border: 'none' }}
          >
            {isSignUp ? 'Login' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
