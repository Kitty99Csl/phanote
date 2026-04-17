import { useEffect } from 'react'

export default function App() {
  useEffect(() => {
    document.title = 'Phajot Tower'
  }, [])

  return (
    <div className="min-h-screen bg-celadon-50 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4">🌿</div>
        <h1 className="text-3xl font-bold text-ink-900 mb-3 font-display">
          Phajot Tower
        </h1>
        <p className="text-ink-700 text-lg leading-relaxed mb-6">
          "Phajot watches your money. Tower watches Phajot."
        </p>
        <p className="text-ink-500 text-sm">
          Lobby coming in Session 16. 🛡️
        </p>
        <div className="mt-8 inline-block px-4 py-2 rounded-full bg-celadon-100 text-ink-900 text-xs font-mono">
          build: v0.1.0 · deploy: pages.dev
        </div>
      </div>
    </div>
  )
}
