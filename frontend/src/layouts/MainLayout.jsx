import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
    { to: "/owner/jadwal", label: "Jadwal Kerja", icon: "fa-solid fa-clock" },
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
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "auto");
  const [activeTheme, setActiveTheme] = useState("light");

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
  const [showLogout, setShowLogout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
  };

  const [navAlert, setNavAlert] = useState(localStorage.getItem("smpj_nav_alert") || "");
  const [navBadges, setNavBadges] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("smpj_supervisor_nav_badges") || "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    const handleAlert = () => setNavAlert(localStorage.getItem("smpj_nav_alert") || "");
    const handleBadges = () => {
      try {
        setNavBadges(JSON.parse(localStorage.getItem("smpj_supervisor_nav_badges") || "{}"));
      } catch {
        setNavBadges({});
      }
    };
    const handleStorage = () => {
      handleAlert();
      handleBadges();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("smpj-nav-alert", handleAlert);
    window.addEventListener("smpj-nav-badges-update", handleBadges);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("smpj-nav-alert", handleAlert);
      window.removeEventListener("smpj-nav-badges-update", handleBadges);
    };
  }, []);

  const showBottomNav = isMobile;
  const baseItems = navByRole[role] || [];
  const items = showBottomNav
    ? [...baseItems, { to: "#logout", label: "Keluar", icon: "fa-solid fa-power-off", action: () => setShowLogout(true) }]
    : baseItems;
  const handleNavClick = (item, closeAfter = false) => (e) => {
    if (item.action) {
      e.preventDefault();
      item.action();
    }
    if (closeAfter) setSidebarOpen(false);
  };

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col font-[SF Pro Display,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif] transition-colors duration-700 ${
        activeTheme === "dark"
          ? "bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] text-gray-100"
          : "bg-gradient-to-br from-[#ecf5ff] via-[#f7f9fc] to-[#e0f7fa] text-gray-800"
      }`}
    >
{/* 🌈 Efek Aurora Background */}
<div className="aurora-wrapper fixed inset-0 -z-10 overflow-hidden">
  <div
    className={`absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full blur-3xl opacity-30 animate-float-slow ${
      activeTheme === "dark"
        ? "bg-gradient-to-r from-[#22d3ee]/40 to-[#818cf8]/40"
        : "bg-gradient-to-r from-[#7dd3fc]/40 to-[#c084fc]/30"
    }`}
  />
  <div
    className={`absolute bottom-[-15%] right-[-10%] w-[70vw] h-[70vw] rounded-full blur-3xl opacity-30 animate-float ${
      activeTheme === "dark"
        ? "bg-gradient-to-tr from-[#0ea5e9]/40 to-[#67e8f9]/40"
        : "bg-gradient-to-tr from-[#bae6fd]/40 to-[#e0f2fe]/40"
    }`}
  />
  {/* Lapisan gradien halus di atas agar tidak ada “warna tanggung” */}
  <div
    className={`absolute top-0 left-0 w-full h-[30vh] bg-gradient-to-b ${
      activeTheme === "dark"
        ? "from-[#0f172a]/95 to-transparent"
        : "from-[#e0f2fe]/70 to-transparent"
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
            ? "bg-[#1e293b]/70 border-gray-700"
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
            <div className="h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center">
              <img
                src={logoAurora}
                alt="SMPJ Logo"
                className="h-9 w-9 rounded-full object-cover"
              />
            </div>
            <h1
              className={`text-lg font-semibold tracking-tight ${
                activeTheme === "dark" ? "text-gray-100" : "text-gray-800"
              }`}
            >
              SMPJ | Jambar Jabu
            </h1>
          </button>

          {/* === Header kanan === */}
          {!showBottomNav && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className={`lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all duration-300 ${
                  activeTheme === "dark"
                    ? "bg-[#0f172a]/50 border-gray-600 text-gray-200 hover:bg-[#1e293b]/80"
                    : "bg-white/80 border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <i className="fa-solid fa-bars" />
                Menu
              </button>

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
                  className={`absolute w-6 h-6 rounded-full bg-white shadow-md transform transition-all duration-500 flex items-center justify-center text-[12px] ${
                    activeTheme === "dark"
                      ? "translate-x-7 text-yellow-300"
                      : "translate-x-1 text-blue-500"
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      activeTheme === "dark" ? "fa-moon" : "fa-sun"
                    }`}
                  />
                </div>
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
          )}
        </div>
      </header>

      {/* === BODY === */}
      <div className={`flex-1 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6 px-4 md:px-6 py-6 ${showBottomNav ? "pb-24" : ""}`}>
        {/* === SIDEBAR === */}
        {!showBottomNav && (
          <aside
            className={[
              "w-full lg:w-64 flex-shrink-0 transition-all duration-500",
              sidebarOpen ? "block" : "hidden lg:block",
            ].join(" ")}
          >
            <nav
              className={`rounded-3xl p-4 shadow-xl border space-y-1 backdrop-blur-xl transition-all duration-700 max-h-[70vh] lg:max-h-none overflow-y-auto ${
                activeTheme === "dark"
                  ? "bg-[#1e293b]/70 border-gray-700"
                  : "bg-white/70 border-gray-200"
              }`}
            >
              {items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  onClick={handleNavClick(it, true)}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[15px] font-medium transition-all duration-300 relative",
                      navAlert === it.to ? "after:absolute after:-top-1 after:-right-1 after:w-3 after:h-3 after:rounded-full after:bg-primary" : "",
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
                  {navBadges[it.to] > 0 && (
                    <span className="ml-auto text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full">
                      {navBadges[it.to] > 9 ? "9+" : navBadges[it.to]}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>
        )}

        {/* === MAIN CONTENT === */}
        <main
          className={`flex-1 rounded-[1.5rem] p-5 md:p-8 shadow-xl border min-h-[70vh] backdrop-blur-2xl transition-all duration-700 overflow-visible ${
            activeTheme === "dark"
              ? "bg-[#1e293b]/60 border-gray-700 hover:shadow-gray-800/40"
              : "bg-white/70 border-gray-200 hover:shadow-gray-300/50"
          }`}
        >
          <div className="max-w-6xl mx-auto w-full space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* === FOOTER / MOBILE NAV === */}
      {showBottomNav ? (
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl ${
            activeTheme === "dark"
              ? "bg-[#0f172a]/80 border-gray-700 text-gray-100"
              : "bg-white/90 border-gray-200 text-gray-700"
          }`}
        >
          <nav className="flex justify-between overflow-x-auto px-2 py-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={handleNavClick(it)}
                className={({ isActive }) =>
                  [
                    "flex flex-col items-center justify-center gap-1 px-3 py-1 text-xs font-medium transition relative",
                    navAlert === it.to ? "after:absolute after:top-0 after:right-2 after:w-2 after:h-2 after:rounded-full after:bg-primary" : "",
                    isActive
                      ? "text-primary scale-105"
                      : activeTheme === "dark"
                      ? "text-gray-300"
                      : "text-gray-500",
                  ].join(" ")
                }
              >
                <i className={`${it.icon} text-base`} />
                <span>{it.label}</span>
                {navBadges[it.to] > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] font-semibold bg-red-500 text-white px-1.5 py-[1px] rounded-full">
                    {navBadges[it.to] > 9 ? "9+" : navBadges[it.to]}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      ) : (
        <footer
          className={`text-center text-sm py-6 border-t backdrop-blur-md transition-all duration-700 ${
            activeTheme === "dark"
              ? "border-gray-700 text-gray-400 bg-[#0f172a]/50"
              : "border-gray-200 text-gray-500 bg-white/50"
          }`}
        >
          © {new Date().getFullYear()} SMPJ | Jambar Jabu — Sistem Manajemen Pegawai & Jadwal
        </footer>
      )}
    </div>
  );
}
