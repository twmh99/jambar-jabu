import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";
import Modal from "../../components/common/Modal";

const metricOptions = [
  {
    value: "overall",
    label: "Pegawai Terbaik (Akumulasi)",
    calc: "Skor akhir = (Hadir x bobot) + (Kepatuhan x bobot) + (Jam kerja x bobot) + (Total gaji x bobot).",
  },
  {
    value: "hadir",
    label: "Jumlah Kehadiran",
    calc: "Mengurutkan pegawai berdasarkan total hari hadir pada periode yang sama.",
  },
  {
    value: "disiplin",
    label: "Kepatuhan Jadwal",
    calc: "Persentase kepatuhan diambil dari rasio jadwal yang dipenuhi dibanding total jadwal.",
  },
  {
    value: "gaji",
    label: "Gaji Tertinggi",
    calc: "Total gaji yang diterima pegawai selama periode analisis.",
  },
  {
    value: "jam",
    label: "Jam Kerja Terbanyak",
    calc: "Jumlah jam/menit kerja tercatat pada sistem.",
  },
];

export default function Analytics() {
  const [trend, setTrend] = useState([]);
  const [topMetric, setTopMetric] = useState(metricOptions[0].value);
  const [topData, setTopData] = useState([]);
  const [topMeta, setTopMeta] = useState({});
  const [loadingTop, setLoadingTop] = useState(false);
  const [topDetail, setTopDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [fullData, setFullData] = useState([]);
  const [fullLoading, setFullLoading] = useState(false);
  const chartSize = useMemo(() => {
    const dataLength = trend.length || 1;
    return {
      width: Math.max(dataLength * 80, 520),
      height: 320,
    };
  }, [trend]);

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

  const loadFullRanking = useCallback(async () => {
    setFullLoading(true);
    try {
      const res = await api.get("/laporan/analisis", {
        params: { metric: topMetric, limit: 50 },
      });
      setFullData(res.data?.data || []);
    } catch (err) {
      console.error("Full ranking error:", err.response?.data || err.message);
      toast.error("Gagal memuat seluruh peringkat pegawai");
    } finally {
      setFullLoading(false);
    }
  }, [topMetric]);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

  useEffect(() => {
    loadTop();
  }, [loadTop]);

  useEffect(() => {
    if (fullOpen) {
      loadFullRanking();
    }
  }, [fullOpen, loadFullRanking]);

  const rupiah = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }),
    []
  );

  const formatTopValue = useCallback(
    (item) => {
      switch (topMetric) {
        case "gaji":
          return rupiah.format(item.value || 0);
        case "jam":
          return `${item.value?.toFixed(1) || 0} jam`;
        case "disiplin":
          return `${item.value?.toFixed(1) || 0}%`;
        case "overall":
          return `${item.value?.toFixed(1) || 0} poin`;
        case "hadir":
        default:
          return `${item.value || item.total_hadir || 0} hadir`;
      }
    },
    [topMetric, rupiah]
  );

  const getDetailRows = useCallback(
    (item) => {
      if (!item) return [];
      const rows = [];
      const pushRow = (label, value) => {
        if (value !== undefined && value !== null && value !== "") {
          rows.push({ label, value });
        }
      };

      switch (topMetric) {
        case "overall":
          pushRow("Poin Akumulasi", `${item.value?.toFixed(1) || 0} poin`);
          pushRow("Total Hadir", `${item.total_hadir || 0} hari`);
          pushRow(
            "Kepatuhan Jadwal",
            item.total_jadwal
              ? `${((item.total_hadir / item.total_jadwal) * 100 || 0).toFixed(
                  1
                )}% (${item.total_hadir || 0}/${item.total_jadwal})`
              : undefined
          );
          if (item.minutes)
            pushRow(
              "Total Jam",
              `${(item.minutes / 60).toFixed(1)} jam (${item.minutes} menit)`
            );
          if (item.total_gaji)
            pushRow("Total Gaji", rupiah.format(item.total_gaji || 0));
          break;
        case "hadir":
          pushRow("Total Hadir", `${item.total_hadir || item.value || 0} hari`);
          pushRow("Rentang Penilaian", topMeta?.periode || topMeta?.range);
          break;
        case "disiplin":
          pushRow(
            "Persentase Kepatuhan",
            `${item.value?.toFixed(1) || 0}%`
          );
          pushRow(
            "Detail Jadwal",
            `${item.total_hadir || 0} hadir dari ${item.total_jadwal || 0} jadwal`
          );
          break;
        case "gaji":
          pushRow("Total Gaji", rupiah.format(item.value || 0));
          if (item.total_shift) pushRow("Total Shift", `${item.total_shift}`);
          break;
        case "jam":
          pushRow(
            "Total Jam Kerja",
            `${item.value?.toFixed(1) || (item.minutes || 0) / 60} jam`
          );
          if (item.minutes)
            pushRow("Menit Kerja", `${item.minutes} menit tercatat`);
          break;
        default:
          pushRow("Nilai", formatTopValue(item));
      }

      return rows;
    },
    [rupiah, topMetric, topMeta, formatTopValue]
  );

  const handleShowDetail = (item) => {
    setTopDetail(item);
    setDetailOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Kinerja Pegawai (Total Kehadiran)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto pb-2">
            <BarChart
              width={chartSize.width}
              height={chartSize.height}
              data={trend}
              margin={{ top: 16, right: 24, left: 70, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="nama"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={70}
                label={{ value: "Pegawai", position: "bottom", offset: 10 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                allowDecimals={false}
                label={{
                  value: "Total Kehadiran (hari)",
                  angle: -90,
                  position: "insideLeft",
                  offset: -15,
                  style: { textAnchor: "middle" },
                }}
              />
              <Tooltip formatter={(v) => [`${v} hari`, "Kehadiran"]} />
              <Bar
                dataKey="total_hadir"
                fill="#f7c948"
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
              >
                <LabelList
                  dataKey="total_hadir"
                  position="top"
                  fill="#334155"
                  fontSize={12}
                  formatter={(value) => `${value} hari`}
                />
              </Bar>
            </BarChart>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Top 3 Data Pegawai</CardTitle>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {topMeta?.title || metricOptions.find((m) => m.value === topMetric)?.label || "Peringkat terbaik berdasarkan metrik pilihan"}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full lg:w-auto lg:flex-row lg:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFullOpen(true);
                loadFullRanking();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm whitespace-nowrap w-full lg:w-auto lg:order-1"
            >
              <i className="fa-solid fa-list" />
              Lihat Semua
            </Button>
            <select
              className="ds-input w-full lg:w-60 lg:order-2 h-[42px]"
              value={topMetric}
              onChange={(e) => setTopMetric(e.target.value)}
            >
              {metricOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTop ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Memuat data...
            </p>
          ) : topData.length ? (
            <div className="space-y-3">
              {topData.map((item, index) => (
                <button
                  key={`${item.nama}-${index}`}
                  type="button"
                  onClick={() => handleShowDetail(item)}
                  className="w-full flex items-center justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 px-4 py-3 text-left transition hover:bg-[hsl(var(--accent))/0.15]"
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
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Belum ada data pada kategori ini.
            </p>
          )}
        </CardContent>
      </Card>

      <Modal
        open={fullOpen}
        title={`Peringkat Lengkap | ${
          metricOptions.find((m) => m.value === topMetric)?.label || "Top Pegawai"
        }`}
        onClose={() => setFullOpen(false)}
      >
        {fullLoading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Memuat semua data...</p>
        ) : fullData.length ? (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {fullData.map((item, index) => (
              <button
                key={`full-${item.nama}-${index}`}
                type="button"
                onClick={() => handleShowDetail(item)}
                className="w-full flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-left hover:bg-[hsl(var(--accent))/0.15] transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[hsl(var(--primary))]">
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
                <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                  {formatTopValue(item)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Belum ada data pada kategori ini.
          </p>
        )}
      </Modal>

      <Modal
        open={detailOpen}
        title={
          topDetail
            ? `${topDetail.nama} | ${
                metricOptions.find((m) => m.value === topMetric)?.label || ""
              }`
            : "Detail"
        }
        onClose={() => setDetailOpen(false)}
      >
        {topDetail && (() => {
          const rows = getDetailRows(topDetail);
          return (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-1">
                Penjelasan
              </p>
              <p className="text-[hsl(var(--foreground))]">
                {
                  metricOptions.find((opt) => opt.value === topMetric)?.calc ||
                  "Perhitungan menyesuaikan metrik yang dipilih."
                }
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))] overflow-hidden">
              {rows.map((row, idx) => (
                <div
                  key={`${row.label}-${idx}`}
                  className="flex items-center justify-between px-4 py-2 bg-[hsl(var(--card))]"
                >
                  <span className="text-[hsl(var(--muted-foreground))]">
                    {row.label}
                  </span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">
                    {row.value}
                  </span>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                  Tidak ada detail tambahan.
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </Modal>
    </div>
  );
}
