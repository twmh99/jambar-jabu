"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function MiniSalesChart({
  data,
}: {
  data: { label: string; total: number }[];
}) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Belum ada data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="dashboardArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#fb7185" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#fb7185" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" width={60} />
        <Tooltip
          contentStyle={{
            background: "rgba(255,255,255,0.9)",
            borderRadius: "12px",
            border: "1px solid rgba(148,163,184,0.3)",
            color: "#1f2937",
          }}
          formatter={(value: number) => [
            `Rp ${Number(value).toLocaleString("id-ID")}`,
            "Penjualan",
          ]}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#fb7185"
          fill="url(#dashboardArea)"
          strokeWidth={3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
