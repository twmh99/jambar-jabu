import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/button';

export default function OwnerLayout() {
  const navItems = [
    { path: '/owner', label: 'Dashboard', icon: 'fa-solid fa-chart-line' },
    { path: '/owner/employees', label: 'Pegawai', icon: 'fa-solid fa-users' },
    { path: '/owner/attendance', label: 'Absensi', icon: 'fa-solid fa-calendar-check' },
    { path: '/owner/payroll', label: 'Gaji & Tip', icon: 'fa-solid fa-file-invoice-dollar' },
    { path: '/owner/analytics', label: 'Analitik', icon: 'fa-solid fa-chart-simple' },
  ];

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Sidebar */}
      <aside className="w-64 bg-[hsl(var(--primary))] text-white flex flex-col justify-between shadow-lg">
        <div>
          <div className="p-6 font-semibold text-xl tracking-wide border-b border-white/20">SMPJ Owner</div>
          <nav className="flex flex-col p-3 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-white/20 text-yellow-300'
                      : 'text-white hover:bg-white/10'
                  }`
                }
              >
                <i className={`${item.icon}`} /> {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-white/20">
          <Button variant="outline" className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
            <i className="fa-solid fa-right-from-bracket mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-[#f9fafc] overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
