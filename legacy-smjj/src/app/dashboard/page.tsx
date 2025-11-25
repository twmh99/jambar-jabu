import Shell from "@/components/Shell";
import { requireRole } from "@/lib/session";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import MiniSalesChart from "@/components/MiniSalesChart";
import {
  Users,
  Clock,
  ShoppingBag,
  Trophy,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const can = await requireRole(["OWNER", "PEGAWAI"]);
  if (!can.ok) redirect("/login");

  const [
    { rows: pelanggan },
    { rows: kunjungan },
    { rows: penjualan },
    { rows: monthlySalesRows },
    { rows: recentVisitsRows },
  ] = await Promise.all([
    query("SELECT COUNT(*)::int AS total FROM customers"),
    query("SELECT COUNT(*)::int AS total FROM visits"),
    query("SELECT COALESCE(SUM(total_spend),0)::int AS total FROM visits"),
    query(
      `
      SELECT
        TO_CHAR(date_trunc('month', visited_at), 'Mon') AS label,
        SUM(total_spend)::int AS total,
        date_trunc('month', visited_at) AS month_sort
      FROM visits
      WHERE visited_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
      GROUP BY label, month_sort
      ORDER BY month_sort
    `
    ),
    query(
      `
      SELECT v.id, v.visited_at, v.total_spend, v.earned_pts, c.name AS customer_name
      FROM visits v
      JOIN customers c ON c.id = v.customer_id
      ORDER BY v.visited_at DESC
      LIMIT 5
    `
    ),
  ]);

  const totalPelanggan = pelanggan[0]?.total || 0;
  const totalKunjungan = kunjungan[0]?.total || 0;
  const totalPenjualan = penjualan[0]?.total || 0;
  const monthlySales = monthlySalesRows.map((row: any) => ({
    label: row.label,
    total: Number(row.total) || 0,
  }));
  const recentVisits = recentVisitsRows;

  const metricCards = [
    {
      title: "Total Pelanggan",
      value: totalPelanggan.toLocaleString("id-ID"),
      icon: <Users size={24} />,
      accent: "from-rose-500/80 to-orange-400/80",
      text: "text-rose-600",
    },
    {
      title: "Riwayat Kunjungan",
      value: totalKunjungan.toLocaleString("id-ID"),
      icon: <Clock size={24} />,
      accent: "from-indigo-500/80 to-blue-400/80",
      text: "text-indigo-600",
    },
    {
      title: "Total Penjualan",
      value: `Rp ${Number(totalPenjualan).toLocaleString("id-ID")}`,
      icon: <ShoppingBag size={24} />,
      accent: "from-emerald-500/80 to-teal-400/80",
      text: "text-emerald-600",
    },
  ];

  const shortcuts = [
    { label: "Kelola Menu", href: "/menu" },
    { label: "Lihat Pelanggan", href: "/pelanggan" },
    { label: "Riwayat Kunjungan", href: "/riwayat" },
    { label: "Laporan", href: "/laporan" },
  ];

  return (
    <Shell>
      <div className="min-h-screen bg-gradient-to-br from-white via-rose-50/40 to-white p-6 md:p-10">
        <div className="mx-auto max-w-6xl space-y-10">
          <section className="flex flex-col gap-6 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-rose-50/40 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">
                SMJJ Dashboard
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                Operasional & Loyalitas dalam satu panel
              </h1>
              <p className="text-sm text-slate-500">
                Ringkasan performa pelanggan, transaksi, dan menu favorit
                tersaji secara real-time, siap membantu keputusan cepat.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 rounded-2xl border border-rose-100 bg-white px-6 py-4 text-sm text-slate-600 sm:w-auto">
              <div className="flex items-center gap-2">
                <Sparkles className="text-rose-400" size={16} />
                Insight hari ini
              </div>
              <p className="text-xl font-semibold text-slate-900">
                {totalKunjungan} kunjungan aktif & {totalPelanggan} pelanggan
              </p>
            </div>
          </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {metricCards.map((card) => (
            <MetricCard key={card.title} card={card} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-2xl shadow-rose-100 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-rose-400">
                  Tren Penjualan
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  6 Bulan Terakhir
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Total Rp {Number(totalPenjualan).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="mt-6 h-60 w-full">
              <MiniSalesChart data={monthlySales} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-2xl shadow-rose-100">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-500">
              Aktivitas Terbaru
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              5 Kunjungan terakhir
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {recentVisits.map((visit: any) => (
                <li
                  key={visit.id}
                  className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {visit.customer_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(visit.visited_at).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">
                      Rp {Number(visit.total_spend || 0).toLocaleString("id-ID")}
                    </span>
                    <span className="text-rose-500">
                      +{visit.earned_pts} pts
                    </span>
                  </div>
                </li>
              ))}
              {recentVisits.length === 0 && (
                <li className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-3 text-center text-xs text-slate-400">
                  Belum ada kunjungan terbaru.
                </li>
              )}
            </ul>
          </div>
        </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-2xl shadow-rose-100 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-rose-400">
                    Aktivitas Terbaru
                  </p>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Progress Operasional
                  </h2>
                </div>
                <a
                  href="/riwayat"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-rose-500 hover:text-rose-600"
                >
                  Detail <ArrowRight size={16} />
                </a>
              </div>
              <div className="mt-6 space-y-4 text-sm text-slate-600">
                <p>
                  • Data transaksi pelanggan terbaru akan dimuat otomatis dari
                  POS/visit import.
                </p>
                <p>• Gunakan menu Riwayat untuk sweeping data dan koreksi.</p>
                <p>
                  • Fitur insight lebih lanjut siap dikembangkan sesuai
                  kebutuhan.
                </p>
              </div>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-2xl shadow-rose-100">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-500">
                Quick Access
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Navigasi Cepat
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {shortcuts.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 transition hover:border-rose-200 hover:bg-rose-50"
                  >
                    {item.label}
                    <ArrowRight size={16} className="text-slate-300" />
                  </a>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-amber-100 to-rose-50 p-4 text-xs text-amber-700">
                Tips: pantau menu favorit lewat halaman laporan untuk melihat
                menu dengan penjualan tertinggi.
              </div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

function MetricCard({
  card,
}: {
  card: {
    title: string;
    value: string;
    icon: React.ReactNode;
    accent: string;
    text: string;
  };
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white p-6 shadow-xl shadow-rose-100 transition hover:-translate-y-1">
      <div
        className={`absolute inset-x-6 top-5 h-10 rounded-full bg-gradient-to-r ${card.accent} blur-2xl opacity-50`}
      />
      <div className="relative flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-4 py-2 text-[13px] font-semibold text-slate-500">
          {card.icon}
          {card.title}
        </div>
        <div className="space-y-2">
          <p className={`text-[10px] uppercase tracking-[0.35em] ${card.text}`}>
            {card.title}
          </p>
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
        </div>
      </div>
    </div>
  );
}
