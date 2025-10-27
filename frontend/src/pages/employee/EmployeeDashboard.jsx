import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "../../components/ui/toast";
import WorkProgress from "../../components/employee/WorkProgress";
import HistoryList from "../../components/employee/HistoryList";
import api from "../../services/api";

const fmtDate = (d = new Date()) => d.toISOString().slice(0, 10);
const toArray = (res) => {
  if (!res) return [];
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export default function EmployeeDashboard() {
  const user = JSON.parse(localStorage.getItem("smpj_user") || "{}");
  const pegawaiId = user?.pegawai_id || user?.id;

  const [time, setTime] = React.useState(new Date());
  const [todaySchedule, setTodaySchedule] = React.useState(null);
  const [weekHours, setWeekHours] = React.useState(0);
  const [history, setHistory] = React.useState([]);

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = React.useCallback(async () => {
    if (!pegawaiId) return;

    try {
      const [schRes, attRes] = await Promise.all([
        api.get(`/pegawai/jadwal/${pegawaiId}`),
        api.get(`/pegawai/absensi/${pegawaiId}`),
      ]);

      const schedules = toArray(schRes);
      const attendances = toArray(attRes);

      const today = fmtDate();
      const scToday = schedules.find((s) => s.tanggal === today);
      setTodaySchedule(scToday || null);

      const weekStart = (() => {
        const d = new Date();
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - (day - 1));
        return fmtDate(d);
      })();

      const parseHMS = (s) => {
        if (!s) return null;
        const [H, M, S] = s.split(":").map((n) => parseInt(n, 10));
        return H * 3600 + M * 60 + (S || 0);
      };

      const weekRows = attendances.filter((r) => r.tanggal >= weekStart);
      const hours = weekRows.reduce((acc, r) => {
        const tin = parseHMS(r.check_in),
          tout = parseHMS(r.check_out);
        if (tin && tout && tout > tin) acc += (tout - tin) / 3600;
        return acc;
      }, 0);
      setWeekHours(Math.round(hours * 100) / 100);

      const last7 = attendances
        .slice()
        .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
        .slice(0, 7)
        .map((r) => ({ tanggal: r.tanggal, status: r.status || "-" }));
      setHistory(last7);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data dashboard pegawai");
    }
  }, [pegawaiId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onCheckIn = async () => {
    try {
      await api.post(`/pegawai/checkin`, { pegawai_id: pegawaiId });
      toast.success("Check-in berhasil!");
      load();
    } catch {
      toast.error("Check-in gagal");
    }
  };

  const onCheckOut = async () => {
    try {
      await api.post(`/pegawai/checkout`, { pegawai_id: pegawaiId });
      toast.success("Check-out berhasil!");
      load();
    } catch {
      toast.error("Check-out gagal");
    }
  };

  return (
    <div className="space-y-6">
      {/* === Header Profil === */}
      <div className="flex justify-between items-start border-b pb-2">
        <div>
          <h2 className="text-lg font-semibold">Profil Pegawai</h2>
          <p className="text-sm text-gray-500">
            ID: {user?.id || "-"} | {user?.name || "Pegawai"}
          </p>
        </div>
        <div className="text-sm text-gray-500 font-mono">
          {time.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}{" "}
          | {time.toLocaleTimeString("id-ID", { hour12: false })}
        </div>
      </div>

      {/* === Jadwal Hari Ini === */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Jadwal Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <b>Shift:</b> {todaySchedule?.shift || "—"}
            </div>
            <div>
              <b>Jam Masuk:</b>{" "}
              {todaySchedule?.jam_mulai
                ? `${todaySchedule.jam_mulai} - ${todaySchedule.jam_selesai}`
                : "—"}
            </div>
            <div>
              <b>Lokasi:</b>{" "}
              <span className="font-semibold text-primary">Jambar Jabu</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={onCheckIn}>
              <i className="fa-solid fa-right-to-bracket mr-2" /> Check-In
            </Button>
            <Button variant="outline" onClick={onCheckOut}>
              <i className="fa-solid fa-right-from-bracket mr-2" /> Check-Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* === Jam Kerja Minggu Ini === */}
      <Card>
        <CardHeader>
          <CardTitle>Jam Kerja Minggu Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkProgress hours={weekHours} target={40} />
        </CardContent>
      </Card>

      {/* === Riwayat 7 Hari === */}
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
