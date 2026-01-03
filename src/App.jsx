import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import VisualProgress from './pages/VisualProgress'
import DailyProgress from './pages/DailyProgress'
import BulkUpdate from './pages/BulkUpdate'
import Billing from './pages/Billing'
import Workers from './pages/Workers'
import DailyAttendance from './pages/DailyAttendance'
import Settlements from './pages/Settlements'
import LabourReports from './pages/LabourReports'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/visual-progress" element={<VisualProgress />} />
              <Route path="/daily-progress" element={<DailyProgress />} />
              <Route path="/bulk-update" element={<BulkUpdate />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/workers" element={<Workers />} />
              <Route path="/daily-attendance" element={<DailyAttendance />} />
              <Route path="/settlements" element={<Settlements />} />
              <Route path="/labour-reports" element={<LabourReports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
