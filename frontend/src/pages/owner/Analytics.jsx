import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";

const metricOptions = [
  { value: "hadir", label: "Jumlah Kehadiran" },
  { value: "disiplin", label: "Kepatuhan Jadwal" },
  { value: "gaji", label: "Gaji Tertinggi" },
  { value: "jam", label: "Jam Kerja Terbanyak" },
];

export default function Analytics() {
  const [trend, setTrend] = useState([]);
  const [topMetric, setTopMetric] = useState(metricOptions[0].value);
  const [topData, setTopData] = useState([]);
  const [topMeta, setTopMeta] = useState({});
  const [loadingTop, setLoadingTop] = useState(false);

  const loadTrend = useCallback(async () => {
    try {
      const res = await api.get("/laporan/analisis", {
        params: { metric: "hadir" },
      });
      setTrend(res.data?.data || []);
    } catch (err) {
      console.error("Analisis error:", err.response?.data || err.message);
      toast.error("Gagal memuat grafik kinerja");
    }
  }, []);

  const loadTop = useCallback(async () => {
    setLoadingTop(true);
    try {
      const res = await api.get("/laporan/analisis", {
        params: { metric: topMetric, limit: 3 },
      });
      setTopData(res.data?.data || []);
      setTopMeta(res.data?.meta || {});
    } catch (err) {
      console.error("Top performer error:", err.response?.data || err.message);
      toast.error("Gagal memuat Top 3 pegawai");
    } finally {
      setLoadingTop(false);
    }
  }, [topMetric]);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

  useEffect(() => {
    loadTop();
  }, [loadTop]);

  const rupiah = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }),
    []
  );

  const formatTopValue = (item) => {
    switch (topMetric) {
      case "gaji":
        return rupiah.format(item.value || 0);
      case "jam":
        return `${item.value?.toFixed(1) || 0} jam`;
      case "disiplin":
        return `${item.value?.toFixed(1) || 0}%`;
      case "hadir":
      default:
        return `${item.value || item.total_hadir || 0} hadir`;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Kinerja Pegawai (Total Kehadiran)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              {/* ⬅️ nama langsung di root object */}
              <XAxis dataKey="nama" />
              <YAxis />
              <Tooltip formatter={(v) => [`${v} hari`, "Kehadiran"]} />
              <Line
                type="monotone"
                dataKey="total_hadir"   // ⬅️ samakan dengan backend
                stroke="#f7c948"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Top 3 Data Pegawai</CardTitle>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {topMeta?.title || "Peringkat terbaik berdasarkan metrik pilihan"}
            </p>
          </div>
          <select
            className="ds-input w-full lg:w-60"
            value={topMetric}
            onChange={(e) => setTopMetric(e.target.value)}
          >
            {metricOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {loadingTop ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Memuat data...
            </p>
          ) : topData.length ? (
            <div className="space-y-3">
              {topData.map((item, index) => (
                <div
                  key={`${item.nama}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))] font-semibold flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-[hsl(var(--foreground))]">
                        {item.nama}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {item.jabatan || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[hsl(var(--primary))]">
                      {formatTopValue(item)}
                    </p>
                    {topMetric === "disiplin" && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {item.total_hadir || 0} hadir /{" "}
                        {item.total_jadwal || 0} jadwal
                      </p>
                    )}
                    {topMetric === "hadir" && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Konsistensi tinggi dalam kehadiran
                      </p>
                    )}
                    {topMetric === "jam" && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {item.minutes || 0} menit kerja tercatat
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Belum ada data pada kategori ini.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
