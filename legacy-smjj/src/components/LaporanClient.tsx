"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";
import {
  Users,
  Clock,
  ShoppingBag,
  Trophy,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function LaporanClient({ data }: any) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCetak = () => {
    setIsPrinting(true);
    const doc = new jsPDF();
    doc.text(" Laporan Keuangan & Aktivitas Jambar Jabu", 14, 15);
    doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 14, 25);

    autoTable(doc, {
      head: [["Kategori", "Nilai"]],
      body: [
        ["Total Pelanggan", data.pelanggan.toString()],
        ["Total Kunjungan", data.kunjungan.toString()],
        ["Total Penjualan (Rp)", data.penjualan.toLocaleString("id-ID")],
        ["Menu Terfavorit", data.favorit],
      ],
      startY: 35,
    });

    doc.save("laporan.pdf");
    setIsPrinting(false);
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    const summaries = [
      ["Total Pelanggan", data.pelanggan],
      ["Total Kunjungan", data.kunjungan],
      ["Total Penjualan", data.penjualan],
      ["Menu Terfavorit", data.favorit],
    ];

    const grafikRows = [["Bulan", "Total (Rp)"]];
    data.grafik.forEach((row: any) => {
      grafikRows.push([row.bulan, row.total]);
    });

    const csvRows = [
      ["Laporan SMJJ"],
      [`Tanggal`, new Date().toLocaleDateString("id-ID")],
      [],
      ["Ringkasan KPI"],
      ...summaries,
      [],
      ["Penjualan per Bulan"],
      ...grafikRows,
      [],
      ["Top Menu Bulan Ini", data.favorit],
    ];

    const csv = csvRows
      .map((row) =>
        row
          .map((val) => {
            const str = String(val ?? "");
            if (str.includes(",") || str.includes('"')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-smjj-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-rose-50/40 to-white p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="flex flex-col gap-5 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-rose-50/60 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">
              Laporan SMJJ
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Dashboard Laporan & Insight Real-time
            </h1>
            <p className="text-sm text-slate-500">
              Pantau pelanggan, transaksi, dan menu favorit dalam satu layar yang estetik.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="rounded-2xl border border-rose-100 bg-white px-4 py-2 text-xs text-slate-500">
              Update {new Date().toLocaleDateString("id-ID")}
            </span>
            <button
              onClick={handleCetak}
              disabled={isPrinting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-orange-400 to-yellow-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Printer size={18} /> {isPrinting ? "Mencetak..." : "Cetak PDF"}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-white px-5 py-3 text-sm font-semibold text-rose-500 shadow hover:bg-rose-50 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileSpreadsheet size={18} />{" "}
              {isExporting ? "Membuat CSV..." : "Export Excel"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Card icon={<Users size={26} />} title="Total Pelanggan" value={data.pelanggan} accent="rose" />
          <Card icon={<Clock size={26} />} title="Total Kunjungan" value={data.kunjungan} accent="indigo" />
          <Card
            icon={<ShoppingBag size={26} />}
            title="Total Penjualan"
            value={`Rp ${data.penjualan.toLocaleString("id-ID")}`}
            accent="emerald"
          />
          <Card icon={<Trophy size={26} />} title="Menu Terfavorit" value={data.favorit} accent="amber" />
        </div>

        <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-2xl shadow-rose-100">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-rose-400">
                Grafik
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                Penjualan per Bulan
              </h2>
            </div>
            <div className="text-sm text-slate-400">
              Monitoring 12 bulan terakhir
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.grafik}>
                <defs>
                  <linearGradient id="bar" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                <XAxis dataKey="bulan" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.95)",
                    borderRadius: "12px",
                    border: "1px solid rgba(148,163,184,0.35)",
                    color: "#1f2937",
                  }}
                />
                <Bar dataKey="total" fill="url(#bar)" radius={[16, 16, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, value, accent }: any) {
  const accentStyles: Record<
    string,
    { ring: string; border: string; text: string; iconBg: string }
  > = {
    rose: {
      ring: "from-rose-50 to-orange-50",
      border: "border-rose-100",
      text: "text-rose-500",
      iconBg: "bg-gradient-to-br from-rose-500 to-orange-400 text-white",
    },
    indigo: {
      ring: "from-indigo-50 to-sky-50",
      border: "border-indigo-100",
      text: "text-indigo-500",
      iconBg: "bg-gradient-to-br from-indigo-500 to-sky-500 text-white",
    },
    emerald: {
      ring: "from-emerald-50 to-teal-50",
      border: "border-emerald-100",
      text: "text-emerald-600",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-400 text-white",
    },
    amber: {
      ring: "from-amber-50 to-rose-50",
      border: "border-amber-100",
      text: "text-amber-600",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
    },
  };

  const accentStyle = accentStyles[accent] || accentStyles.rose;

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border ${accentStyle.border} bg-white p-6 shadow-lg transition hover:-translate-y-1`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accentStyle.ring} opacity-0 transition group-hover:opacity-100`}
      />
      <div className="relative flex flex-col gap-4">
        <div className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-white ${accentStyle.iconBg}`}>
          {icon}
        </div>
        <div className="space-y-2">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${accentStyle.text}`}>
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
