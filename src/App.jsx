import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <div className="flex items-center justify-center min-h-screen text-[var(--color-text-sub)]">Loading...</div>
  if (!user) return <Navigate to="/login" />
  return children
}

export default function App() {
  const { initialize } = useAuthStore()
  useEffect(() => { initialize() }, [])

  return (
    <BrowserRouter>
      <div className="max-w-[430px] mx-auto min-h-screen relative">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="p-6 text-center pt-20">
                <h1 className="text-3xl font-bold font-display text-[var(--color-accent-dk)]">Phanote</h1>
                <p className="text-[var(--color-text-sub)] mt-2">Auth working! Build screens next.</p>
                <button
                  onClick={() => useAuthStore.getState().signOut()}
                  className="mt-6 px-6 py-3 rounded-full bg-[var(--color-expense-bg)] text-[var(--color-expense)] font-semibold"
                >
                  Logout
                </button>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
