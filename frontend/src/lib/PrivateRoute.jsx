import React from "react";
import { Navigate } from "react-router-dom";

/**
 * 🔒 PrivateRoute — membatasi akses halaman berdasarkan role & token login.
 * - Jika belum login → redirect ke /login
 * - Jika role tidak cocok → redirect ke dashboard sesuai role yang benar
 */
export default function PrivateRoute({ children, role }) {
  const token = localStorage.getItem("smpj_token");
  const userRole = (localStorage.getItem("smpj_role") || "").toLowerCase();

  // 🚫 Belum login → ke halaman login
  if (!token) return <Navigate to="/login" replace />;

  // 🔧 Normalisasi role agar pegawai dan employee dianggap sama
  const normalizedRole =
    userRole === "pegawai" ? "employee" : userRole;

  // 🚫 Role tidak cocok → arahkan ke dashboard role-nya sendiri
  if (role && normalizedRole !== role) {
    switch (normalizedRole) {
      case "owner":
        return <Navigate to="/owner/dashboard" replace />;
      case "supervisor":
        return <Navigate to="/supervisor/dashboard" replace />;
      case "employee":
        return <Navigate to="/employee/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  // ✅ Jika sesuai → tampilkan halaman
  return children;
}
