import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import SchedulePage from './pages/SchedulePage'
import CanteenPage from './pages/CanteenPage'
import TradePage from './pages/TradePage'
import LostFoundPage from './pages/LostFoundPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import TestPage from './pages/TestPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="canteen" element={<CanteenPage />} />
          <Route path="trade" element={<TradePage />} />
          <Route path="lost-found" element={<LostFoundPage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="test" element={<TestPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
