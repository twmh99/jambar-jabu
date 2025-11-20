import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/table";
import { Input, Select, Label } from "../../components/ui/input";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";

const fmtNumber = (val = 0, fractionDigits = 0) =>
  Number(val || 0).toLocaleString("id-ID", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

export default function Pay() {
  const user = JSON.parse(localStorage.getItem("smpj_user") || "{}");
  const pegawaiId = user?.pegawai_id || user?.pegawai?.id || user?.id;
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [filterMode, setFilterMode] = React.useState("all");
  const [selectedMonth, setSelectedMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  React.useEffect(() => {
    if (!pegawaiId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/pegawai/gaji/${pegawaiId}`);
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setRows(data);
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat gaji & tip");
      } finally {
        setLoading(false);
      }
    })();
  }, [pegawaiId]);

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      if (!row?.tanggal) return true;
      const date = row.tanggal;
      if (filterMode === "month" && selectedMonth) {
        return date.startsWith(selectedMonth);
      }
      if (filterMode === "range") {
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
      }
      return true;
    });
  }, [rows, filterMode, selectedMonth, startDate, endDate]);

  const total = filteredRows.reduce(
    (acc, r) => ({
      jam: acc.jam + Math.max(0, parseFloat(r.jam || r.jam_kerja || 0)),
      tips: acc.tips + Math.max(0, Number(r.tip || r.tips || 0)),
      total: acc.total + Math.max(0, Number(r.total || 0)),
    }),
    { jam: 0, tips: 0, total: 0 }
  );

  const weeklyBreakdown = React.useMemo(() => {
    const groups = {};
    filteredRows.forEach((row) => {
      if (!row.tanggal) return;
      const d = new Date(row.tanggal);
      const weekKey = `${d.getFullYear()}-W${Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + d.getDay() + 1) / 7)}`;
      groups[weekKey] = groups[weekKey] || { week: weekKey, jam: 0, tips: 0, total: 0 };
      groups[weekKey].jam += parseFloat(row.jam || row.jam_kerja || 0) || 0;
      groups[weekKey].tips += Number(row.tip || row.tips || 0) || 0;
      groups[weekKey].total += Number(row.total || 0) || 0;
    });
    return Object.values(groups).sort((a, b) => (a.week < b.week ? 1 : -1));
  }, [filteredRows]);

  const isOnTrack = (total.jam || 0) >= 0.8 * 40;
  const sparklinePoints = weeklyBreakdown.slice(0, 6).map((w) => w.total);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gaji & Tip Saya</CardTitle>
        <div className="rounded-lg bg-[hsl(var(--muted))] px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] flex flex-wrap gap-4 items-center">
          <span>Total Jam: <b className="text-primary">{fmtNumber(total.jam, 2)}</b></span>
          <span>Total Tip: <b className="text-primary">{fmtNumber(total.tips)}</b></span>
          <span>Total Gaji: <b className="text-primary">{fmtNumber(total.total)}</b></span>
          <span className={`ml-auto inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${isOnTrack ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
            {isOnTrack ? "On Track" : "Perlu Tambahan Jam"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Mode Filter</Label>
              <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
                <option value="all">Semua Tanggal</option>
                <option value="month">Per Bulan</option>
                <option value="range">Rentang Tanggal</option>
              </Select>
            </div>
            {filterMode === "month" && (
              <div className="space-y-1">
                <Label>Pilih Bulan</Label>
                <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
              </div>
            )}
            {filterMode === "range" && (
              <>
                <div className="space-y-1">
                  <Label>Dari Tanggal</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Sampai Tanggal</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-4 mb-4 space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Rangkuman Per Minggu</p>
          <div className="flex items-end gap-2 overflow-x-auto">
            {weeklyBreakdown.map((w) => (
              <div key={w.week} className="flex-1 min-w-[70px] text-center">
                <div className="h-16 flex items-end justify-center">
                  <div
                    className="w-6 rounded-full bg-primary/40"
                    style={{ height: `${Math.min(100, (w.total / (total.total || 1)) * 100 || 0)}%` }}
                  />
                </div>
                <p className="text-xs mt-1 font-semibold">{w.week}</p>
                <p className="text-xs text-muted-foreground">Rp{fmtNumber(w.total)}</p>
              </div>
            ))}
            {weeklyBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada data mingguan.</p>
            )}
          </div>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Tanggal</TH>
              <TH>Jam</TH>
              <TH>Rate</TH>
              <TH>Tip</TH>
              <TH>Total</TH>
            </TR>
          </THead>
          <TBody>
            {loading && (
              <TR>
                <TD colSpan={5} className="py-6 text-center text-gray-400">
                  Memuat data...
                </TD>
              </TR>
            )}
            {!loading &&
              filteredRows.map((r, i) => {
                const jam = Math.max(0, r.jam ?? r.jam_kerja ?? 0);
                const tip = Math.max(0, r.tip ?? r.tips ?? 0);
                return (
                  <TR key={i}>
                    <TD>{r.tanggal}</TD>
                    <TD>{fmtNumber(jam, 2)}</TD>
                    <TD>{fmtNumber(r.rate)}</TD>
                    <TD>{fmtNumber(tip)}</TD>
                    <TD>{fmtNumber(r.total)}</TD>
                  </TR>
                );
              })}
            {!loading && filteredRows.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-6 text-center text-gray-400">
                  Belum ada data
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
