import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input, Label, Select } from "../../components/ui/input";
import WorkProgress from "../../components/employee/WorkProgress";
import HistoryList from "../../components/employee/HistoryList";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";

const fmtDate = (d = new Date()) => d.toISOString().slice(0, 10);

export default function EmployeeDashboard() {
  const [time, setTime] = React.useState(new Date()); // 🕒 Live Clock
  const [employees, setEmployees] = React.useState([]);
  const [selectedEmp, setSelectedEmp] = React.useState("");
  const [todaySchedule, setTodaySchedule] = React.useState(null);
  const [weekHours, setWeekHours] = React.useState(0);
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // 🕒 Update waktu tiap detik
  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔹 Load data awal (pegawai & jadwal)
  React.useEffect(() => {
    (async () => {
      try {
        const [empRes, schRes] = await Promise.all([
          api.get("employees"),
          api.get("schedules", { params: { date_str: undefined } }),
        ]);
        setEmployees(empRes.data || []);
        if ((empRes.data || []).length) setSelectedEmp(empRes.data[0].id);

        const today = fmtDate();
        const scToday = (schRes.data || []).find((s) => s.tanggal === today);
        setTodaySchedule(scToday || null);
      } catch {
        toast.error("Gagal memuat data pegawai / jadwal");
      }
    })();
  }, []);

  // 🔹 Load riwayat dan jam minggu ini ketika pegawai berubah
  React.useEffect(() => {
    if (!selectedEmp) return;
    (async () => {
      try {
        const res = await api.get("attendance", { params: { employee_id: selectedEmp } });
        const rows = Array.isArray(res.data) ? res.data : [];

        // Riwayat 7 hari terakhir
        const last7 = rows
          .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
          .slice(0, 7)
          .map((r) => ({ tanggal: r.tanggal, status: r.status }));
        setHistory(last7);

        // Jam minggu ini
        const weekStart = (() => {
          const d = new Date();
          const day = d.getDay() || 7;
          d.setDate(d.getDate() - (day - 1));
          return fmtDate(d);
        })();
        const weekRows = rows.filter((r) => r.tanggal >= weekStart);
        const parseHMS = (s) => {
          if (!s) return null;
          const [H, M, S] = s.split(":").map((n) => parseInt(n, 10));
          return H * 3600 + M * 60 + (S || 0);
        };
        const hours = weekRows.reduce((acc, r) => {
          const tin = parseHMS(r.check_in),
            tout = parseHMS(r.check_out);
          if (tin != null && tout != null && tout > tin) acc += (tout - tin) / 3600;
          return acc;
        }, 0);
        setWeekHours(Math.round(hours * 100) / 100);
      } catch {
        setHistory([]);
        setWeekHours(0);
      }
    })();
  }, [selectedEmp]);

  // 🔹 Aksi Check-In
  const onCheckIn = async () => {
    if (!selectedEmp) return toast.error("Pilih pegawai dulu");
    try {
      const res = await api.post("attendance/checkin", { employee_id: selectedEmp });
      toast.success("Check-in berhasil!");
      setHistory((h) => [{ tanggal: res.data.tanggal, status: res.data.status }, ...h]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Check-in gagal");
    }
  };

  // 🔹 Aksi Check-Out
  const onCheckOut = async () => {
    if (!selectedEmp) return toast.error("Pilih pegawai dulu");
    try {
      await api.post("attendance/checkout", { employee_id: selectedEmp, tips: 0 });
      toast.success("Check-out berhasil!");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Check-out gagal");
    }
  };

  const empOptions = employees.map((e) => ({ value: e.id, label: e.nama }));
  const selected = employees.find((e) => e.id === selectedEmp);

  return (
    <div className="space-y-6">
      {/* ==================== Header Profil Pegawai ==================== */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--muted))] pb-2">
        <div className="flex items-start gap-3">
          <div
            className="h-9 w-9 rounded-md shadow-sm"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
            }}
          />
          <div>
            <div className="font-semibold">Profil Pegawai</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              ID: {selected?.id || "—"}
            </div>
          </div>
        </div>

        {/* 🕒 Live Clock */}
        <div className="text-sm text-[hsl(var(--muted-foreground))] font-mono tabular-nums">
          {time.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}{" "}
          | {time.toLocaleTimeString("id-ID", { hour12: false })}
        </div>
      </div>

      {/* ==================== Jadwal Hari Ini ==================== */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Jadwal Hari Ini</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="sr-only">Pegawai</Label>
            <Select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="min-w-48"
            >
              {empOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Shift</div>
            <div className="mt-1 text-lg font-semibold">{todaySchedule?.shift || "—"}</div>
          </div>
          <div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Jam Masuk</div>
            <div className="mt-1 text-lg font-semibold">{todaySchedule?.jam_mulai || "—"}</div>
          </div>
          <div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Lokasi</div>
            <div className="mt-1 text-lg font-semibold">Jambar Jabu</div>
          </div>

          <div className="sm:col-span-3 flex gap-3 pt-3">
            <Button
              onClick={onCheckIn}
              className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
            >
              <i className="fa-solid fa-right-to-bracket mr-2" /> Check-In
            </Button>
            <Button variant="outline" onClick={onCheckOut}>
              <i className="fa-solid fa-right-from-bracket mr-2" /> Check-Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ==================== Jam Kerja Minggu Ini ==================== */}
      <Card>
        <CardHeader>
          <CardTitle>Jam Kerja Minggu Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkProgress hours={weekHours} target={40} />
        </CardContent>
      </Card>

      {/* ==================== Riwayat 7 Hari ==================== */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat 7 Hari</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryList items={history} />
        </CardContent>
      </Card>
    </div>
  );
}
