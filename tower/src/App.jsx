import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ShellLayout from './layouts/ShellLayout'
import Lobby from './routes/Lobby'
import Health from './routes/Health'
import AICalls from './routes/AICalls'
import DailyStats from './routes/DailyStats'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ShellLayout />}>
          <Route path="/" element={<Lobby />} />
          <Route path="/health" element={<Health />} />
          <Route path="/ai-calls" element={<AICalls />} />
          <Route path="/daily-stats" element={<DailyStats />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
