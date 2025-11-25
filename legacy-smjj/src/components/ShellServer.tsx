import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { LogOut, LayoutDashboard, Users, ClipboardList, Gift, FileText, ListChecks } from "lucide-react";

// 🚫 jangan pakai "use client" di sini — ini server component
export default async function ShellServer({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Pelanggan", href: "/pelanggan", icon: <Users size={20} /> },
    { name: "Menu", href: "/menu", icon: <ListChecks size={20} /> },
    { name: "Riwayat", href: "/riwayat", icon: <ClipboardList size={20} /> },
    { name: "Reward", href: "/reward", icon: <Gift size={20} /> },
  ];

  if (user?.role === "OWNER") {
    menuItems.push({ name: "Laporan", href: "/laporan", icon: <FileText size={20} /> });
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#e31c1c] text-white flex flex-col justify-between shadow-xl">
        <div className="flex flex-col items-center border-b border-white/20 py-6">
          <div className="bg-white/20 rounded-full p-4 mb-3">
            <Users size={36} />
          </div>
          <h2 className="text-lg font-semibold">{user?.name || "Pengguna"}</h2>
          <p className="text-sm italic text-white/80">{user?.role || "Pegawai"}</p>
        </div>

        <nav className="flex flex-col flex-1 justify-start space-y-1 p-4">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition"
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/20 p-4">
          <a
            href="/api/logout"
            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition text-sm font-medium"
          >
            <LogOut size={18} />
            Logout
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
