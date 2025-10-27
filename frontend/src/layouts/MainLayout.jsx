import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ToastViewport, toast } from "../components/ui/toast";
import ConfirmLogoutModal from "../components/ui/ConfirmLogoutModal";
import api from "../services/api";
import logoAurora from "/home/willy/smpj/frontend/assets/Logo Jambar Jabu.jpg";

/* ======================================================
   🧭 Navigasi Berdasarkan Role
   ====================================================== */
const navByRole = {
  owner: [
    { to: "/owner/dashboard", label: "Dashboard", icon: "fa-solid fa-gauge" },
    { to: "/owner/employees", label: "Data Pegawai", icon: "fa-solid fa-users" },
    { to: "/owner/attendance", label: "Laporan Absensi", icon: "fa-solid fa-calendar-check" },
    { to: "/owner/payroll", label: "Laporan Gaji & Tip", icon: "fa-solid fa-money-bill-wave" },
    { to: "/owner/analytics", label: "Analisis Kinerja", icon: "fa-solid fa-chart-line" },
  ],
  supervisor: [
    { to: "/supervisor/dashboard", label: "Dashboard", icon: "fa-solid fa-gauge" },
    { to: "/supervisor/jadwal", label: "Jadwal Kerja", icon: "fa-solid fa-clock" },
    { to: "/supervisor/employees", label: "Data Pegawai", icon: "fa-solid fa-users" },
    { to: "/supervisor/absensi", label: "Absensi Pegawai", icon: "fa-solid fa-user-check" },
    { to: "/supervisor/rekap", label: "Rekap & Verifikasi", icon: "fa-solid fa-clipboard-check" },
    { to: "/supervisor/laporan", label: "Laporan Periodik", icon: "fa-solid fa-file-lines" },
  ],
  employee: [
    { to: "/employee/dashboard", label: "Dashboard", icon: "fa-solid fa-gauge" },
    { to: "/employee/schedule", label: "Jadwal Saya", icon: "fa-solid fa-calendar-days" },
    { to: "/employee/attendance", label: "Absensi", icon: "fa-solid fa-user-check" },
    { to: "/employee/pay", label: "Gaji & Tip", icon: "fa-solid fa-wallet" },
    { to: "/employee/profile", label: "Profil Saya", icon: "fa-solid fa-id-badge" },
  ],
};

/* ======================================================
   🌙 Layout adaptif terang/gelap + Aurora dinamis
   ====================================================== */
export default function MainLayout() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "auto");
  const [activeTheme, setActiveTheme] = useState("light");

  // 🌓 Deteksi preferensi sistem
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => {
      const mode = theme === "auto" ? (mq.matches ? "dark" : "light") : theme;
      setActiveTheme(mode);
      document.documentElement.classList.toggle("dark", mode === "dark");
    };
    updateTheme();
    mq.addEventListener("change", updateTheme);
    return () => mq.removeEventListener("change", updateTheme);
  }, [theme]);

  let role = (localStorage.getItem("smpj_role") || "").toLowerCase();
  if (role === "pegawai") role = "employee";
  const user = JSON.parse(localStorage.getItem("smpj_user") || "{}");
  const items = navByRole[role] || [];
  const [showLogout, setShowLogout] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogoutConfirm = async () => {
    try {
      setLoading(true);
      await api.post("/logout");
    } finally {
      localStorage.clear();
      toast.info("Berhasil keluar dari sistem.");
      setShowLogout(false);
      navigate("/login");
      setLoading(false);
    }
  };

  // 🌗 Switch manual tema
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col font-[SF Pro Display,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif] transition-colors duration-700 ${
        activeTheme === "dark"
          ? "bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] text-gray-100"
          : "bg-gradient-to-br from-[#ecf5ff] via-[#f7f9fc] to-[#e0f7fa] text-gray-800"
      }`}
    >
      {/* 🌈 Efek Aurora Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className={`absolute top-[-10%] left-[-15%] w-[70vw] h-[70vw] rounded-full blur-3xl opacity-25 animate-float-slow ${
            activeTheme === "dark"
              ? "bg-gradient-to-r from-[#22d3ee]/40 to-[#818cf8]/40"
              : "bg-gradient-to-r from-[#7dd3fc]/40 to-[#c084fc]/30"
          }`}
        />
        <div
          className={`absolute bottom-[-20%] right-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-25 animate-float ${
            activeTheme === "dark"
              ? "bg-gradient-to-tr from-[#0ea5e9]/40 to-[#67e8f9]/40"
              : "bg-gradient-to-tr from-[#bae6fd]/40 to-[#e0f2fe]/40"
          }`}
        />
      </div>

      <ToastViewport />
      <ConfirmLogoutModal
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogoutConfirm}
        loading={loading}
      />

      {/* === HEADER === */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl border-b shadow-sm transition-all duration-700 ${
          activeTheme === "dark"
            ? "bg-[#1e293b]/60 border-gray-700"
            : "bg-white/70 border-gray-200"
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              if (role === "owner") navigate("/owner/dashboard");
              else if (role === "supervisor") navigate("/supervisor/dashboard");
              else if (role === "employee") navigate("/employee/dashboard");
              else navigate("/login");
            }}
            className="flex items-center gap-3 hover:opacity-90 transition"
          >
            <img
              src={logoAurora}
              alt="SMPJ Logo"
              className="h-9 w-9 rounded-xl object-cover shadow-md"
            />
            <h1
              className={`text-lg font-semibold tracking-tight ${
                activeTheme === "dark" ? "text-gray-100" : "text-gray-800"
              }`}
            >
              SMPJ • Jambar Jabu
            </h1>
          </button>

          {/* === Header kanan === */}
          <div className="flex items-center gap-4">
            {/* iOS Theme Switch */}
            <button
              onClick={toggleTheme}
              className={`relative w-14 h-7 flex items-center rounded-full transition-all duration-500 ${
                activeTheme === "dark"
                  ? "bg-gradient-to-r from-[#38bdf8] to-[#818cf8]"
                  : "bg-gradient-to-r from-[#bae6fd] to-[#c7d2fe]"
              }`}
              title={`Ubah tema (${theme})`}
            >
              <div
                className={`absolute w-6 h-6 rounded-full bg-white shadow-md transform transition-all duration-500 ${
                  activeTheme === "dark" ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>

            <span
              className={`hidden sm:inline font-medium capitalize ${
                activeTheme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {user?.name || role || "Pengguna"}
            </span>

            <button
              onClick={() => setShowLogout(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
                activeTheme === "dark"
                  ? "bg-[#0f172a]/50 border-gray-600 text-gray-200 hover:bg-[#1e293b]/80"
                  : "bg-white/80 border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <i className="fa-solid fa-right-from-bracket" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* === BODY === */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col md:flex-row gap-6 px-4 md:px-6 py-6">
        {/* === SIDEBAR === */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav
            className={`rounded-3xl p-4 shadow-xl border space-y-1 backdrop-blur-xl transition-all duration-700 ${
              activeTheme === "dark"
                ? "bg-[#1e293b]/70 border-gray-700"
                : "bg-white/70 border-gray-200"
            }`}
          >
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px] font-medium transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-r from-[#38bdf8] to-[#06b6d4] text-white shadow-[0_0_12px_rgba(56,189,248,0.5)] scale-[1.03]"
                      : activeTheme === "dark"
                      ? "text-gray-300 hover:bg-[#334155]/70 hover:text-[#38bdf8]"
                      : "text-gray-700 hover:bg-[#e0f2fe]/80 hover:text-[#0369a1]",
                  ].join(" ")
                }
              >
                <i className={it.icon + " text-[16px]"} />
                <span>{it.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* === MAIN CONTENT === */}
        <main
          className={`flex-1 rounded-[2rem] p-8 shadow-xl border min-h-[75vh] backdrop-blur-2xl transition-all duration-700 ${
            activeTheme === "dark"
              ? "bg-[#1e293b]/60 border-gray-700 hover:shadow-gray-800/40"
              : "bg-white/70 border-gray-200 hover:shadow-gray-300/50"
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* === FOOTER === */}
      <footer
        className={`text-center text-sm py-6 border-t backdrop-blur-md transition-all duration-700 ${
          activeTheme === "dark"
            ? "border-gray-700 text-gray-400 bg-[#0f172a]/50"
            : "border-gray-200 text-gray-500 bg-white/50"
        }`}
      >
        © {new Date().getFullYear()} SMPJ • Jambar Jabu — Sistem Manajemen Pegawai & Jadwal
      </footer>
    </div>
  );
}
