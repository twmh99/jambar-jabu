"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  LogOut,
  LayoutDashboard,
  Users,
  ClipboardList,
  Gift,
  FileText,
  ListChecks,
  Moon,
  Sun,
  Settings,
} from "lucide-react";
import AppDialog from "./AppDialog";
import ToastProvider from "./ToastProvider";
import ProfileSettingsModal from "./ProfileSettingsModal";

export default function ShellClient({
  user,
  children,
}: {
  user: any;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "SMJJ";
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profile, setProfile] = useState(user);
  useEffect(() => setProfile(user), [user]);
  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const cancelLogout = () => setShowLogoutConfirm(false);
  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    window.location.href = "/api/logout";
  };

  // dYO- untuk tema gelap / terang
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme === "dark";

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Pelanggan", href: "/pelanggan", icon: <Users size={18} /> },
    { name: "Menu", href: "/menu", icon: <ListChecks size={18} /> },
    { name: "Riwayat", href: "/riwayat", icon: <ClipboardList size={18} /> },
    { name: "Reward", href: "/reward", icon: <Gift size={18} /> },
  ];

  if (user?.role === "OWNER") {
    menuItems.push({ name: "Laporan", href: "/laporan", icon: <FileText size={20} /> });
  }

  return (
    <ToastProvider>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-50 via-white to-slate-100 text-gray-900 transition-colors duration-300 dark:from-[#050505] dark:via-[#0d0d0d] dark:to-[#151515] dark:text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-rose-400/25 blur-[140px] dark:bg-rose-500/10" />
        <div className="absolute bottom-[-20%] right-[-10%] h-96 w-96 rounded-full bg-sky-300/25 blur-[160px] dark:bg-sky-500/10" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col gap-4 px-3 py-4 text-[11px] lg:h-screen lg:flex-row lg:overflow-hidden lg:px-6 lg:py-8">
        {/* Sidebar modern */}
        <aside className="flex w-full flex-shrink-0 flex-col justify-between rounded-3xl border border-white/60 bg-white/90 px-4 py-4 text-[11px] shadow-2xl backdrop-blur-2xl transition-all duration-300 dark:border-white/10 dark:bg-white/5 lg:sticky lg:top-8 lg:w-56">
          {/* Profil user */}
          <div className="space-y-3 text-center text-[13px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-rose-500/80 dark:text-rose-200/80">
              {appName}
            </p>
            <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-200/60 dark:shadow-rose-950/30">
              {profile?.avatar_data ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_data}
                  alt={profile?.name || "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Users size={30} />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-300/80">Selamat datang</p>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.name || "Pengguna"}</h2>
              <span className="mt-2 inline-flex items-center rounded-full bg-rose-50 px-3 py-0.5 text-[11px] font-semibold text-rose-600 dark:bg-white/10 dark:text-rose-200">
                {profile?.role || user?.role || "Pegawai"}
              </span>
            </div>
          </div>

          {/* Navigasi */}
          <nav className="mt-4 flex flex-1 flex-col space-y-1 text-[11px]">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-2 rounded-2xl px-3 py-1.5 transition-all duration-200 ${
                    isActive
                      ? "bg-rose-500/15 text-rose-600 shadow-inner shadow-rose-200/50 dark:bg-white/10 dark:text-white"
                      : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-xl border text-[11px] ${
                      isActive
                        ? "border-rose-500 bg-white text-rose-600 dark:border-white/30 dark:bg-white/10 dark:text-white"
                        : "border-gray-200 text-gray-500 dark:border-white/10 dark:text-gray-300"
                    }`}
                  >
                    {item.icon && (
                      <span className="text-[16px] leading-none">
                        {item.icon}
                      </span>
                    )}
                  </span>
                  <span className="flex-1 text-[13px] font-medium">{item.name}</span>
                  <span className="text-lg text-gray-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:text-gray-500">
                    &rsaquo;
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Bagian bawah: Toggle & Logout */}
          <div className="mt-4 space-y-3 rounded-2xl border border-white/60 bg-white/90 p-3 text-[12px] shadow-inner shadow-gray-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/40">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex w-full items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-[11px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 dark:bg-white/10 dark:text-gray-100"
            >
              <span className="flex items-center gap-2">
                <Settings size={16} />
                Pengaturan Profil
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400">
                Edit
              </span>
            </button>
            {/* Tombol toggle tema */}
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex items-center justify-between gap-2 rounded-2xl bg-gray-900/5 px-3 py-2.5 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-900/10 dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/20"
              >
                <span className="flex items-center gap-2">
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  {isDark ? "Mode Terang" : "Mode Gelap"}
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Toggle</span>
              </button>
            )}

            {/* Tombol logout */}
            <button
              type="button"
              onClick={handleLogoutClick}
              className="flex w-full items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 px-3 py-2.5 text-[11px] font-semibold text-white shadow-lg shadow-rose-200/70 transition hover:shadow-xl dark:shadow-rose-900/40"
            >
              <span className="flex items-center gap-2">
                <LogOut size={16} />
                Logout
              </span>
              <span className="text-[10px] uppercase tracking-[0.35em]">Keluar</span>
            </button>
          </div>
        </aside>

        {/* Konten utama */}
        <main className="flex-1 rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-2xl shadow-gray-200/70 backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-black/40 dark:shadow-black/50 sm:p-8 lg:h-full lg:overflow-y-auto">
          <div className="min-h-full pb-10">{children}</div>
        </main>
      </div>

      <AppDialog
        open={showLogoutConfirm}
        title="Keluar dari sesi?"
        description="Anda akan keluar dari aplikasi ini dan harus login kembali untuk melanjutkan."
        confirmText="Logout"
        cancelText="Batal"
        tone="danger"
        icon={<LogOut size={22} />}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
      <ProfileSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={profile}
        onUpdated={(updated) => setProfile(updated)}
      />
      </div>
    </ToastProvider>
  );
}
