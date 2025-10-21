import React, { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ToastViewport, toast } from '../components/ui/toast'
import ConfirmLogoutModal from '../components/ui/ConfirmLogoutModal'

/* ======================================================
   🧭 Navigasi Berdasarkan Role
   ====================================================== */
const navByRole = {
  owner: [
    { to: '/owner', label: 'Dashboard', icon: 'fa-solid fa-gauge' },
    { to: '/owner/employees', label: 'Data Pegawai', icon: 'fa-solid fa-users' },
    { to: '/owner/attendance', label: 'Laporan Absensi', icon: 'fa-solid fa-calendar-check' },
    { to: '/owner/payroll', label: 'Laporan Gaji & Tip', icon: 'fa-solid fa-money-bill-wave' },
    { to: '/owner/analytics', label: 'Analisis Kinerja', icon: 'fa-solid fa-chart-line' },
  ],
  supervisor: [
    { to: '/supervisor/dashboard', label: 'Dashboard', icon: 'fa-solid fa-gauge' },
    { to: '/supervisor/jadwal', label: 'Jadwal Kerja', icon: 'fa-solid fa-clock' },
    { to: '/supervisor/absensi', label: 'Absensi Pegawai', icon: 'fa-solid fa-user-check' },
    { to: '/supervisor/rekap', label: 'Rekap & Verifikasi', icon: 'fa-solid fa-clipboard-check' },
    { to: '/supervisor/laporan', label: 'Laporan Periodik', icon: 'fa-solid fa-file-lines' },
  ],
  employee: [
    { to: '/employee', label: 'Dashboard', icon: 'fa-solid fa-gauge' },
    { to: '/employee/schedule', label: 'Jadwal Saya', icon: 'fa-solid fa-table-list' },
    { to: '/employee/attendance', label: 'Absensi', icon: 'fa-solid fa-bell' },
    { to: '/employee/pay', label: 'Gaji & Tip', icon: 'fa-solid fa-wallet' },
    { to: '/employee/profile', label: 'Profil Saya', icon: 'fa-solid fa-id-badge' },
  ],
}

/* ======================================================
   🧠 Layout Tunggal (Owner, Supervisor, Employee)
   ====================================================== */
export default function MainLayout() {
  const navigate = useNavigate()
  const role = (localStorage.getItem('smpj_role') || '').toLowerCase()
  const user = JSON.parse(localStorage.getItem('smpj_user') || '{}')
  const items = navByRole[role] || []
  const [showLogout, setShowLogout] = useState(false)

  /* ===== Fungsi Logout ===== */
  const handleLogoutConfirm = () => {
    localStorage.removeItem('smpj_token')
    localStorage.removeItem('smpj_role')
    localStorage.removeItem('smpj_user')
    toast.info('Berhasil keluar.')
    setShowLogout(false)
    navigate('/login')
  }

  /* ===== Render ===== */
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <ToastViewport />

      {/* Modal Konfirmasi Logout */}
      <ConfirmLogoutModal
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogoutConfirm}
      />

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-md"
              style={{
                background:
                  'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
              }}
            />
            <div className="font-display font-semibold">SMPJ • Jambar Jabu</div>
          </Link>

          {/* Profil & Tombol Logout */}
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline text-[hsl(var(--muted-foreground))] capitalize">
              {user?.name || role || 'Pengguna'}
            </span>
            <button
              onClick={() => setShowLogout(true)}
              className="ds-btn ds-btn-outline flex items-center"
              title="Keluar dari akun"
            >
              <i className="fa-solid fa-right-from-bracket mr-2" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* ===== BODY ===== */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-12 gap-6 py-6">
        {/* Sidebar Navigasi */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <nav className="ds-card p-2 sticky top-20">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] transition-colors',
                    isActive
                      ? 'bg-[hsl(var(--muted))] text-foreground font-medium'
                      : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
                  ].join(' ')
                }
              >
                <i className={it.icon + ' w-4'}></i>
                <span>{it.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
