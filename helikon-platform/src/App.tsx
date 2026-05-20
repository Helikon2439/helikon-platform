import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import RequestsPage from '@/pages/RequestsPage'
import TasksPage from '@/pages/TasksPage'
import TargetsPage from '@/pages/TargetsPage'
import { OversightPage, HRPage, AccountingPage, AnalyticsPage, HierarchyPage } from '@/pages/OtherPages'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[#07080c] flex items-center justify-center">
      <div className="text-[#d4a84b] font-['Bebas_Neue'] text-2xl tracking-widest animate-pulse">HELIKON</div>
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="targets" element={<TargetsPage />} />
        <Route path="oversight" element={<OversightPage />} />
        <Route path="hr" element={<HRPage />} />
        <Route path="accounting" element={<AccountingPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="hierarchy" element={<HierarchyPage />} />      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
