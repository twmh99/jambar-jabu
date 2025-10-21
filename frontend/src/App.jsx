import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles/globals.css'
import './index.css'

import { ToastViewport } from './components/ui/toast'

// ==== Pages ====
import Login from './pages/Login'

// ==== Layout Tunggal (Untuk Semua Role) ====
import MainLayout from './layouts/MainLayout'

// ==== Owner Pages ====
import OwnerDashboard from './pages/owner/OwnerDashboard'
import Employees from './pages/owner/Employees'
import Analytics from './pages/owner/Analytics'
import AttendanceReport from './pages/owner/AttendanceReport'
import PayrollReport from './pages/owner/PayrollReport'

// ==== Supervisor Pages ====
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard'
import JadwalKerja from './pages/supervisor/JadwalKerja'
import AbsensiPegawai from './pages/supervisor/AbsensiPegawai'
import RekapVerifikasi from './pages/supervisor/RekapVerifikasi'
import LaporanPeriodik from './pages/supervisor/LaporanPeriodik'

// ==== Employee Pages ====
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import Schedule from './pages/employee/Schedule'
import Attendance from './pages/employee/Attendance'
import Pay from './pages/employee/Pay'
import Profile from './pages/employee/Profile'

/* ============================================================
   🔒 Protected Route — hanya izinkan user dengan token valid
   ============================================================ */
function ProtectedRoute({ children, allow }) {
  const token = localStorage.getItem('smpj_token')
  const role = (localStorage.getItem('smpj_role') || '').toLowerCase()

  if (!token) return <Navigate to="/login" replace />
  if (allow && !allow.includes(role)) return <Navigate to="/login" replace />
  return children
}

/* ============================================================
   🚀 App Root
   ============================================================ */
export default function App() {
  return (
    <BrowserRouter>
      <ToastViewport />
      <Routes>
        {/* ==== LOGIN ==== */}
        <Route path="/login" element={<Login />} />

        {/* ==== OWNER ==== */}
        <Route
          path="/owner/*"
          element={
            <ProtectedRoute allow={['owner']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OwnerDashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="attendance" element={<AttendanceReport />} />
          <Route path="payroll" element={<PayrollReport />} />
        </Route>

        {/* ==== SUPERVISOR ==== */}
        <Route
          path="/supervisor/*"
          element={
            <ProtectedRoute allow={['supervisor', 'owner']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SupervisorDashboard />} />
          <Route path="dashboard" element={<SupervisorDashboard />} />
          <Route path="jadwal" element={<JadwalKerja />} />
          <Route path="absensi" element={<AbsensiPegawai />} />
          <Route path="rekap" element={<RekapVerifikasi />} />
          <Route path="laporan" element={<LaporanPeriodik />} />
        </Route>

        {/* ==== EMPLOYEE ==== */}
        <Route
          path="/employee/*"
          element={
            <ProtectedRoute allow={['employee', 'supervisor', 'owner']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<EmployeeDashboard />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="pay" element={<Pay />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* ==== DEFAULT ROUTE ==== */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
