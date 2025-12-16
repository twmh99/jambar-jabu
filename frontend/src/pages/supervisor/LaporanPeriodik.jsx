import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Label, Select } from "../../components/ui/input";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";

const normalizePayload = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const formatDateInput = (date) => {
  const d =
    typeof date === "string" ? new Date(date) : date instanceof Date ? date : new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

const formatDateDisplay = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const toMinutes = (time) => {
  if (!time) return 0;
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
};

const filterByRange = (rows, from, to) => {
  if (!from && !to) return rows;
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  return rows.filter((row) => {
    const current = new Date(row.tanggal);
    if (start && current < start) return false;
    if (end && current > end) return false;
    return true;
  });
};

const scoreKehadiran = (status) => {
  switch (status) {
    case "Hadir":
      return 100;
    case "Terlambat":
      return 70;
    case "Izin":
      return 30;
    default:
      return 0;
  }
};

const buildCustomSeries = (rows, from, to) => {
  const filtered = filterByRange(rows, from, to);
  const grouped = filtered.reduce((acc, row) => {
    const key = row.tanggal;
    if (!acc[key]) {
      acc[key] = { label: key, attendanceScore: 0, productivityScore: 0, total: 0 };
    }
    acc[key].attendanceScore += scoreKehadiran(row.status);
    const duration = Math.max(toMinutes(row.jam_keluar) - toMinutes(row.jam_masuk), 0);
    acc[key].productivityScore += Math.min(Math.round((duration / 480) * 100), 100);
    acc[key].total += 1;
    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => ({
      label: item.label,
      kehadiran: item.total ? Math.round(item.attendanceScore / item.total) : 0,
      produktivitas: item.total ? Math.round(item.productivityScore / item.total) : 0,
    }))
    .sort((a, b) => new Date(a.label) - new Date(b.label));
};

const buildShiftStats = (rows) => {
  const grouped = rows.reduce((acc, row) => {
    const key = row.shift || "Tanpa shift";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(grouped).map(([shift, total]) => ({ shift, total }));
};

const buildDeptStats = (rows, pegawaiMap) => {
  const grouped = rows.reduce((acc, row) => {
    const jabatan = pegawaiMap.get(row.pegawai_id)?.jabatan || "Umum";
    acc[jabatan] = (acc[jabatan] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(grouped).map(([jabatan, total]) => ({ jabatan, total }));
};

export default function LaporanPeriodik() {
  const today = React.useMemo(() => new Date(), []);
  const lastWeek = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d;
  }, []);

  const [viewMode, setViewMode] = React.useState("weekly");
  const [compareMode, setCompareMode] = React.useState("week");
  const [customRange, setCustomRange] = React.useState({
    from: formatDateInput(lastWeek),
    to: formatDateInput(today),
  });

  const [weeklyData, setWeeklyData] = React.useState([]);
  const [monthlyData, setMonthlyData] = React.useState([]);
  const [absensiAll, setAbsensiAll] = React.useState([]);
  const [pegawai, setPegawai] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const pegawaiMap = React.useMemo(() => {
    const map = new Map();
    pegawai.forEach((row) => map.set(row.id, row));
    return map;
  }, [pegawai]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [weeklyRes, monthlyRes, absensiRes, pegawaiRes] = await Promise.all([
        api.get("/absensi/report/weekly"),
        api.get("/absensi/report/monthly"),
        api.get("/absensi"),
        api.get("/pegawai"),
      ]);
      setWeeklyData(normalizePayload(weeklyRes.data));
      setMonthlyData(
        normalizePayload(monthlyRes.data).map((item) => ({
          ...item,
          label: item.periode,
        }))
      );
      setAbsensiAll(normalizePayload(absensiRes.data));
      setPegawai(normalizePayload(pegawaiRes.data));
    } catch (err) {
      console.error("Laporan periodik error:", err);
      toast.error("Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const formatMonthLabel = (value) => {
    if (!value) return "-";
    const str = String(value);
    if (/^\d{4}-\d{2}$/.test(str)) {
      const [year, month] = str.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }
    return value;
  };

  const formatWeekLabel = (raw) => {
    if (!raw) return "-";
    const str = String(raw);
    if (/^\d{6}$/.test(str)) {
      const year = Number(str.slice(0, 4));
      const week = Number(str.slice(4));
      const base = new Date(year, 0, 1 + (week - 1) * 7);
      const day = base.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(base);
      monday.setDate(base.getDate() + diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return `Minggu ke-${week} (${formatDateDisplay(monday)} - ${formatDateDisplay(sunday)})`;
    }
    return raw;
  };

  const chartData = React.useMemo(() => {
    if (viewMode === "weekly") {
      return weeklyData.map((item) => ({
        label: formatWeekLabel(item.minggu),
        kehadiran: item.kehadiran,
        produktivitas: item.produktivitas,
      }));
    }
    if (viewMode === "monthly") {
      return monthlyData.map((item) => ({
        label: formatMonthLabel(item.label),
        kehadiran: item.kehadiran,
        produktivitas: item.produktivitas,
      }));
    }
    return buildCustomSeries(absensiAll, customRange.from, customRange.to);
  }, [viewMode, weeklyData, monthlyData, absensiAll, customRange]);

  const comparison = React.useMemo(() => {
    const dataset = compareMode === "week" ? weeklyData : monthlyData;
    if (!dataset || dataset.length < 2) return null;
    const current = dataset[dataset.length - 1];
    const previous = dataset[dataset.length - 2];
    const labelKey = compareMode === "week" ? "minggu" : "label";
    return {
      currentLabel:
        compareMode === "week" ? formatWeekLabel(current[labelKey]) : current[labelKey],
      previousLabel:
        compareMode === "week"
          ? formatWeekLabel(previous[labelKey])
          : previous[labelKey] ?? "-",
      kehadiranDelta: current.kehadiran - previous.kehadiran,
      produktivitasDelta: current.produktivitas - previous.produktivitas,
    };
  }, [compareMode, weeklyData, monthlyData]);

  const filteredAbsensi = React.useMemo(() => {
    return filterByRange(absensiAll, customRange.from, customRange.to);
  }, [absensiAll, customRange]);

  const shiftStats = React.useMemo(
    () => buildShiftStats(filteredAbsensi),
    [filteredAbsensi]
  );
  const deptStats = React.useMemo(
    () => buildDeptStats(filteredAbsensi, pegawaiMap),
    [filteredAbsensi, pegawaiMap]
  );

  const chartMinWidth = React.useMemo(() => {
    if (chartData.length === 0) return 640;
    const approxWidth = chartData.length * 110;
    return Math.min(Math.max(approxWidth, 640), 2000);
  }, [chartData.length]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Laporan Kehadiran & Produktivitas</CardTitle>
          <CardDescription>
            Pilih periode analisis untuk membandingkan performa antar minggu/bulan atau gunakan
            rentang tanggal custom.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="inline-flex rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-1">
              {[
                { value: "weekly", label: "Mingguan" },
                { value: "monthly", label: "Bulanan" },
                { value: "custom", label: "Custom Range" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition ${
                    viewMode === opt.value
                      ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
                      : "text-[hsl(var(--muted-foreground))]"
                  }`}
                  onClick={() => setViewMode(opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Label className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-2">
              Bandingkan berdasarkan
              <Select value={compareMode} onChange={(e) => setCompareMode(e.target.value)}>
                <option value="week">Mingguan</option>
                <option value="month">Bulanan</option>
              </Select>
            </Label>
          </div>

          {viewMode === "custom" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                <span className="block text-[hsl(var(--muted-foreground))] mb-1">Dari</span>
                <input
                  type="date"
                  className="ds-input w-full"
                  value={customRange.from}
                  max={customRange.to}
                  onChange={(e) =>
                    setCustomRange((prev) => ({ ...prev, from: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="block text-[hsl(var(--muted-foreground))] mb-1">Sampai</span>
                <input
                  type="date"
                  className="ds-input w-full"
                  value={customRange.to}
                  min={customRange.from}
                  max={formatDateInput(today)}
                  onChange={(e) =>
                    setCustomRange((prev) => ({ ...prev, to: e.target.value }))
                  }
                />
              </label>
              <div className="sm:col-span-2 flex items-end">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Rentang ini juga digunakan untuk grafik shift & departemen di bawahnya.
                </p>
              </div>
            </div>
          )}

          <div className="h-80 overflow-x-auto">
            <div style={{ minWidth: chartMinWidth, height: "100%", marginBottom: chartData.length > 6 ? 8 : 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
                  <XAxis
                    dataKey="label"
                    interval={chartData.length > 8 ? 1 : 0}
                    tickMargin={10}
                    tick={{ fontSize: 11 }}
                    height={60}
                  />
                  <YAxis domain={[0, 110]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="kehadiran"
                    name="Kehadiran (%)"
                    stroke="#0f5fa6"
                    strokeWidth={3}
                    dot={false}
                  />
                    <Line
                      type="monotone"
                      dataKey="produktivitas"
                      name="Produktivitas (%)"
                    stroke="#f7b733"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {chartData.length > 6 && (
              <div className="text-right text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Geser untuk melihat minggu lain →
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Perbandingan</CardTitle>
            <CardDescription>
              {compareMode === "week" ? "Minggu" : "Periode"} terakhir dibanding periode
              sebelumnya.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[hsl(var(--border))] p-4 bg-[hsl(var(--muted))]">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Perubahan Kehadiran
              </p>
              <p className="text-3xl font-semibold">
                {comparison.kehadiranDelta > 0 ? "+" : ""}
                {comparison.kehadiranDelta}%
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {comparison.previousLabel} → {comparison.currentLabel}
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(var(--border))] p-4 bg-[hsl(var(--muted))]">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Perubahan Produktivitas
              </p>
              <p className="text-3xl font-semibold">
                {comparison.produktivitasDelta > 0 ? "+" : ""}
                {comparison.produktivitasDelta}%
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {comparison.previousLabel} → {comparison.currentLabel}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

  <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Per Shift</CardTitle>
            <CardDescription>
              Total absensi pada rentang {formatDateDisplay(customRange.from)} s.d. {formatDateDisplay(customRange.to)}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {shiftStats.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-8">
                Belum ada data pada rentang ini.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
                  <XAxis dataKey="shift" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0ea5e9" name="Total Absensi" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi Per Departemen</CardTitle>
            <CardDescription>
              Menggunakan jabatan pegawai untuk mengelompokkan absensi.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {deptStats.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-8">
                Belum ada data pada rentang ini.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptStats} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="jabatan" />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    fill="#fb7185"
                    name="Total Absensi"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {loading && (
        <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          Memuat laporan periodik…
        </p>
      )}
    </div>
  );
}
