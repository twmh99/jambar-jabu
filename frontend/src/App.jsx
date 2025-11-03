import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles/globals.css";
import "./index.css";

import { ToastViewport } from "./components/ui/toast";
import MainLayout from "./layouts/MainLayout";

// 🔒 Private Route
import PrivateRoute from "./lib/PrivateRoute";

// ==== Pages ====
import Login from "./pages/Login";

// ==== Owner Pages ====
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import JadwalKerjaOwner from "./pages/owner/JadwalKerja";
import Employees from "./pages/owner/Employees";
import Analytics from "./pages/owner/Analytics";
import AttendanceReport from "./pages/owner/AttendanceReport";
import PayrollReport from "./pages/owner/PayrollReport";

// ==== Supervisor Pages ====
import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard";
import JadwalKerja from "./pages/supervisor/JadwalKerja";
import SupervisorEmployees from "./pages/supervisor/Employees";
import AbsensiPegawai from "./pages/supervisor/AbsensiPegawai";
import RekapVerifikasi from "./pages/supervisor/RekapVerifikasi";
import LaporanPeriodik from "./pages/supervisor/LaporanPeriodik";

// ==== Employee Pages ====
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import Schedule from "./pages/employee/Schedule";
import Attendance from "./pages/employee/Attendance";
import Pay from "./pages/employee/Pay";
import Profile from "./pages/employee/Profile";

/* ============================================================
   🚀 APP ROOT
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
            <PrivateRoute role="owner">
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<OwnerDashboard />} />
          <Route path="dashboard" element={<OwnerDashboard />} />
          <Route path="jadwal" element={<JadwalKerjaOwner />} />
          <Route path="employees" element={<Employees />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="attendance" element={<AttendanceReport />} />
          <Route path="payroll" element={<PayrollReport />} />
        </Route>

        {/* ==== SUPERVISOR ==== */}
        <Route
          path="/supervisor/*"
          element={
            <PrivateRoute role="supervisor">
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<SupervisorDashboard />} />
          <Route path="dashboard" element={<SupervisorDashboard />} />
          <Route path="jadwal" element={<JadwalKerja />} />
          <Route path="employees" element={<SupervisorEmployees />} />
          <Route path="absensi" element={<AbsensiPegawai />} />
          <Route path="rekap" element={<RekapVerifikasi />} />
          <Route path="laporan" element={<LaporanPeriodik />} />
        </Route>

        {/* ==== EMPLOYEE ==== */}
        <Route
          path="/employee/*"
          element={
            <PrivateRoute role="employee">
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<EmployeeDashboard />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="pay" element={<Pay />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* ==== DEFAULT / FALLBACK ==== */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
