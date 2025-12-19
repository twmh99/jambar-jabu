import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input, Label, Select } from "../../components/ui/input";
import Modal from "../../components/common/Modal";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";
import { Sparkline } from "../../components/charts/Sparkline";
import { useNavigate } from "react-router-dom";
import { normalizeBackendErrors, firstErrorMessage } from "../../utils/validation";

const shiftTimes = {
  Pagi: { jam_mulai: "09:00", jam_selesai: "14:00" },
  Siang: { jam_mulai: "14:00", jam_selesai: "19:00" },
  Malam: { jam_mulai: "19:00", jam_selesai: "00:00" },
};
const rangeOptions = [
  { value: 1, label: "Hanya tanggal ini (1 hari)" },
  { value: 7, label: "Selama 1 minggu (7 hari)" },
  { value: 14, label: "Selama 2 minggu (14 hari)" },
  { value: 30, label: "Selama 1 bulan (30 hari)" },
];

const truncate = (text, length = 32) => {
  if (!text) return "—";
  return text.length > length ? `${text.slice(0, length)}…` : text;
};

const summarizeToday = (jadwal = [], absensi = []) => {
  const activeShifts = new Set(jadwal.map((x) => `${x.shift}-${x.tanggal}`)).size;
  const present = absensi.filter((x) => (x.status || "").toLowerCase() === "hadir").length;
  const late = absensi.filter((x) => (x.status || "").toLowerCase() === "terlambat").length;
  return { activeShifts, present, late };
};

const parseSeconds = (time = "00:00:00") => {
  const [h = 0, m = 0, s = 0] = time.split(":").map((val) => parseInt(val || "0", 10));
  return h * 3600 + m * 60 + s;
};

const calculateOvertimeHours = (records = []) => {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const total = records.reduce((acc, record) => {
    if (!record.tanggal || !record.jam_masuk || !record.jam_keluar) return acc;
    const date = new Date(record.tanggal);
    if (date < weekAgo) return acc;
    const start = parseSeconds(record.jam_masuk);
    let end = parseSeconds(record.jam_keluar);
    if (end < start) end += 24 * 3600;
    const hours = Math.max(0, (end - start) / 3600);
    const overtime = Math.max(0, hours - 8);
    return acc + overtime;
  }, 0);

  return Math.round(total * 10) / 10;
};

const buildAttendanceTrend = (records = []) => {
  if (!records.length) return [];
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  const daily = {};
  records.forEach((r) => {
    if (!r.tanggal) return;
    const date = new Date(r.tanggal);
    if (date < weekAgo) return;
    const key = r.tanggal;
    daily[key] = daily[key] || 0;
    if ((r.status || "").toLowerCase() === "hadir") {
      daily[key] += 1;
    }
  });
  return Object.keys(daily)
    .sort()
    .map((key) => ({
      label: new Date(key).toLocaleDateString("id-ID", { weekday: "short" }),
      value: daily[key],
    }));
};

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const [time, setTime] = React.useState(new Date());
  const [summary, setSummary] = React.useState({ activeShifts: 0, present: 0, late: 0 });
  const [schedules, setSchedules] = React.useState([]);
  const [modalAdd, setModalAdd] = React.useState(false);
  const [modalVerify, setModalVerify] = React.useState(false);
  const [pendingVerify, setPendingVerify] = React.useState([]);
  const [confirmVerifyId, setConfirmVerifyId] = React.useState(null);
  const [employees, setEmployees] = React.useState([]);
  const [pegawaiId, setPegawaiId] = React.useState("");
  const [metrics, setMetrics] = React.useState({
    validatedSchedules: 0,
    pendingRequests: 0,
    overtimeHours: 0,
  });
  const [attendanceTrend, setAttendanceTrend] = React.useState([]);
  const [absensiToday, setAbsensiToday] = React.useState([]);
  const [verifyDetailOpen, setVerifyDetailOpen] = React.useState(false);
  const [verifyDetailLoading, setVerifyDetailLoading] = React.useState(false);
  const [verifyDetail, setVerifyDetail] = React.useState(null);
  const [pullHint, setPullHint] = React.useState(0);
  const pullHintRef = React.useRef(0);
  const isRefreshing = React.useRef(false);
  const [scheduleErrors, setScheduleErrors] = React.useState({});
  React.useEffect(() => {
    if (!modalAdd) setScheduleErrors({});
  }, [modalAdd]);
  const employeeOptions = React.useMemo(
    () =>
      employees
        .filter(
          (p) =>
            (p.user?.role || p.role || "").toLowerCase() !== "supervisor" &&
            (p.jabatan || "").toLowerCase() !== "supervisor"
        )
        .map((p) => ({
          value: String(p.id),
          label: `${p.nama} (${p.jabatan || "Tanpa jabatan"})`,
          role: (p.user?.role || p.role || "").toLowerCase(),
          jabatan: (p.jabatan || "").toLowerCase(),
        })),
    [employees]
  );

  const pegawaiMap = React.useMemo(() => {
    const map = new Map();
    employees.forEach((p) => {
      map.set(p.id, p);
      map.set(String(p.id), p);
    });
    return map;
  }, [employees]);

  const isSupervisorTarget = React.useCallback(
    (targetId) => {
      if (!targetId) return false;
      const info =
        pegawaiMap.get(targetId) ||
        pegawaiMap.get(String(targetId)) ||
        pegawaiMap.get(Number(targetId));
      if (!info) return false;
      const roleName = (info.user?.role || info.role || "").toLowerCase();
      const job = (info.jabatan || "").toLowerCase();
      return roleName === "supervisor" || job === "supervisor";
    },
    [pegawaiMap]
  );

  React.useEffect(() => {
    if (!pegawaiId && employeeOptions.length) {
      setPegawaiId(employeeOptions[0].value);
    }
  }, [pegawaiId, employeeOptions]);

  const downloadAttendanceCSV = () => {
    if (!absensiToday.length) {
      toast.info("Belum ada data absensi hari ini.");
      return;
    }
    const header = ["Nama", "Shift", "Jam Masuk", "Jam Keluar", "Status"];
    const csvRows = absensiToday.map((r) => [
      r.nama || "-",
      r.shift || "-",
      r.jam_masuk || "-",
      r.jam_keluar || "-",
      r.status || "-",
    ]);
    const csvContent = [header, ...csvRows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "laporan_absensi_hari_ini.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadAll = React.useCallback(async () => {
    try {
      const [jadwalToday, absTodayRes, allEmployees, pending, absensiAllRes] = await Promise.all([
        api.get("/jadwal/today"),
        api.get("/absensi/today"),
        api.get("/pegawai"),
        api.get("/absensi/pending"),
        api.get("/absensi"),
      ]);

      const jadwalData = Array.isArray(jadwalToday.data?.data)
        ? jadwalToday.data.data
        : Array.isArray(jadwalToday.data)
        ? jadwalToday.data
        : [];
      const absensiData = Array.isArray(absTodayRes.data) ? absTodayRes.data : [];
      const employeeList = Array.isArray(allEmployees.data?.data)
        ? allEmployees.data.data
        : Array.isArray(allEmployees.data)
        ? allEmployees.data
        : [];
      const pendingRows = Array.isArray(pending.data) ? pending.data : [];
      const absensiFull = Array.isArray(absensiAllRes.data?.data)
        ? absensiAllRes.data.data
        : Array.isArray(absensiAllRes.data)
        ? absensiAllRes.data
        : [];

      setSchedules(jadwalData);
      setPendingVerify(pendingRows);
      setEmployees(employeeList);
      if (employeeList.length && !pegawaiId) setPegawaiId(String(employeeList[0].id));
      setSummary(summarizeToday(jadwalData, absensiData));
      setAbsensiToday(absensiData);

      const scheduledPegawai = new Set(jadwalData.map((s) => s.pegawai_id)).size;
      const pendingRequests = Math.max(employeeList.length - scheduledPegawai, 0);
      const overtimeHours = calculateOvertimeHours(absensiFull);
      setMetrics({
        validatedSchedules: jadwalData.length,
        pendingRequests,
        overtimeHours,
      });
      try {
        const badgePayload = {
          "/supervisor/rekap": pendingRows.length,
          "/supervisor/jadwal": pendingRequests,
        };
        localStorage.setItem("smpj_supervisor_nav_badges", JSON.stringify(badgePayload));
        window.dispatchEvent(new Event("smpj-nav-badges-update"));
      } catch (err) {
        console.warn("Failed to update nav badges", err);
      }
      setAttendanceTrend(buildAttendanceTrend(absensiFull));
    } catch (err) {
      console.error("Supervisor dashboard load error:", err?.response?.data || err.message);
      toast.error("Gagal sinkron dengan data terbaru");
    }
  }, [pegawaiId]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  React.useEffect(() => {
    const startY = { current: null };
    const threshold = 80;

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      } else {
        startY.current = null;
      }
      setPullHint(0);
    };

    const handleTouchMove = (e) => {
      if (startY.current !== null) {
        const dist = e.touches[0].clientY - startY.current;
        if (dist > 0) {
          const next = Math.min(dist, 120);
          pullHintRef.current = next;
          setPullHint(next);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullHintRef.current > threshold && !isRefreshing.current) {
        isRefreshing.current = true;
        navigator.vibrate?.(25);
        await loadAll();
        toast.info("Dashboard diperbarui");
        isRefreshing.current = false;
      }
      pullHintRef.current = 0;
      setPullHint(0);
      startY.current = null;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [loadAll]);

  const createSchedule = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      pegawai_id: fd.get("pegawai_id") || pegawaiId,
      tanggal: fd.get("tanggal"),
      shift: fd.get("shift"),
      jam_mulai: fd.get("jam_mulai"),
      jam_selesai: fd.get("jam_selesai"),
    };
    const rentangHari = Number.parseInt(fd.get("rentang_waktu") || "1", 10);
    const totalDays = Number.isFinite(rentangHari) && rentangHari > 0 ? rentangHari : 1;

    if (isSupervisorTarget(payload.pegawai_id)) {
      toast.error("Supervisor tidak dapat membuat jadwal untuk sesama supervisor.");
      return;
    }

    const validation = validateSchedulePayload(payload);
    if (Object.keys(validation).length > 0) {
      setScheduleErrors(validation);
      const msg = firstErrorMessage(validation) || "Lengkapi data jadwal!";
      toast.error(msg);
      return;
    }
    setScheduleErrors({});

    try {
      const baseDate = new Date(payload.tanggal);
      const createdEntries = [];
      const todayStr = new Date().toISOString().split("T")[0];
      const pegawaiInfo =
        employees.find((emp) => String(emp.id) === String(payload.pegawai_id)) || {};

      for (let i = 0; i < totalDays; i += 1) {
        const targetDate = new Date(baseDate);
        targetDate.setDate(baseDate.getDate() + i);
        const formattedDate = targetDate.toISOString().split("T")[0];
        await api.post("/jadwal", {
          ...payload,
          tanggal: formattedDate,
        });
        if (formattedDate === todayStr) {
          createdEntries.push({
            pegawai_id: payload.pegawai_id,
            nama: pegawaiInfo.nama || `Pegawai #${payload.pegawai_id}`,
            shift: payload.shift,
            jam_mulai: payload.jam_mulai,
            jam_selesai: payload.jam_selesai,
            tanggal: formattedDate,
          });
        }
      }

      toast.success(
        totalDays > 1
          ? `Jadwal berhasil dibuat untuk ${totalDays} hari berturut-turut.`
          : "Jadwal berhasil dibuat"
      );
      setModalAdd(false);
      if (createdEntries.length) {
        setSchedules((prev) => {
          const existingKeys = new Set(
            prev.map(
              (entry) =>
                `${entry.pegawai_id}-${entry.tanggal}-${entry.jam_mulai}-${entry.jam_selesai}`
            )
          );
          const merged = [...prev];
          createdEntries.forEach((entry) => {
            const key = `${entry.pegawai_id}-${entry.tanggal}-${entry.jam_mulai}-${entry.jam_selesai}`;
            if (!existingKeys.has(key)) {
              existingKeys.add(key);
              merged.push(entry);
            }
          });
          return merged;
        });
      }
      await loadAll();
    } catch (err) {
      const backend = normalizeBackendErrors(err?.response?.data?.errors);
      if (Object.keys(backend).length) {
        setScheduleErrors(backend);
        toast.error(firstErrorMessage(backend) || "Gagal membuat jadwal");
      } else {
        toast.error(err?.response?.data?.message || "Gagal membuat jadwal");
      }
    }
  };

  const verifyAttendance = async (id) => {
    try {
      await api.post(`/absensi/verify/${id}`);
      toast.success("Absensi diverifikasi");
      loadAll();
    } catch {
      toast.error("Gagal memverifikasi");
    }
  };

  const openVerifyDetail = async (row) => {
    setVerifyDetailOpen(true);
    setVerifyDetail(null);
    setVerifyDetailLoading(true);
    try {
      const res = await api.get(`/absensi/${row.id}`);
      const data = res.data || {};
      const pegawaiInfo = pegawaiMap.get(data.pegawai_id) || {};
      setVerifyDetail({
        ...row,
        ...data,
        nama: pegawaiInfo.nama || row.nama || `Pegawai #${data.pegawai_id}`,
        jabatan: pegawaiInfo.jabatan,
        foto_url: data.foto_url || data.foto || row.foto_url,
      });
    } catch (err) {
      console.error("Detail absensi error:", err);
      toast.error("Gagal memuat detail absensi");
      setVerifyDetail({ ...row });
    } finally {
      setVerifyDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--muted))] pb-2">
        <h1 className="text-xl font-semibold">Dashboard Supervisor</h1>
        <div className="text-sm font-mono text-[hsl(var(--muted-foreground))]">
          {time.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}{" "}
          | {time.toLocaleTimeString("id-ID", { hour12: false })}
        </div>
      </div>

      {pullHint > 0 && (
        <div className="text-center text-xs text-[hsl(var(--muted-foreground))] -mt-2">
          {pullHint > 80 ? "Lepas untuk refresh" : "Tarik ke bawah untuk refresh"}
        </div>
      )}

      {/* ===== ACTION BUTTONS ===== */}
      <div className="flex justify-end gap-2">
        <Button variant="accent" onClick={() => setModalAdd(true)}>
          <i className="fa-solid fa-plus mr-2" /> Buat Jadwal Baru
        </Button>
        <button
          onClick={() => {
            setModalVerify(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-[#1e293b]/80 dark:hover:text-emerald-300 transition-all duration-200"
        >
          <i className="fa-solid fa-circle-check text-green-500 dark:text-emerald-400 text-base" />
          <span>Verifikasi Absensi</span>
        </button>
      </div>

      {/* ===== SUMMARY ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Shift Aktif Hari Ini</div>
            <div className="text-4xl font-semibold text-[hsl(var(--primary))]">{summary.activeShifts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Pegawai Hadir</div>
            <div className="text-4xl font-semibold text-[hsl(var(--success))]">{summary.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Pegawai Terlambat</div>
            <div className="text-4xl font-semibold text-[hsl(var(--warning))]">{summary.late}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Jadwal Tervalidasi</div>
            <div className="text-4xl font-semibold text-sky-600">{metrics.validatedSchedules}</div>
            <p className="text-xs text-sky-600 mt-1">Total jadwal yang berjalan hari ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Permintaan Jadwal Baru</div>
            <div className="text-4xl font-semibold text-rose-600">{metrics.pendingRequests}</div>
            <p className="text-xs text-rose-600 mt-1">Pegawai tanpa jadwal hari ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Jam Overtime Pekan Ini</div>
            <div className="text-4xl font-semibold text-emerald-600">{metrics.overtimeHours}</div>
            <p className="text-xs text-emerald-600 mt-1">Jam lembur total 7 hari terakhir</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tren Kehadiran Mingguan</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceTrend.length > 0 ? (
              <Sparkline data={attendanceTrend} height={160} />
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada data tren.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => navigate("/supervisor/jadwal?view=week")}>
              <i className="fa-solid fa-calendar-week mr-2" /> Lihat Jadwal Minggu Depan
            </Button>
            <Button variant="outline" onClick={downloadAttendanceCSV}>
              <i className="fa-solid fa-file-arrow-down mr-2" /> Unduh Laporan Absensi Hari Ini
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ===== TABEL JADWAL HARI INI ===== */}
      <Card>
        <CardHeader>
          <CardTitle>Tabel Jadwal Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Nama Pegawai</TH>
                <TH>Shift</TH>
                <TH>Jam Kerja</TH>
                <TH>Tanggal</TH>
              </TR>
            </THead>
            <TBody>
              {schedules.map((s, i) => (
                <TR key={i}>
                  <TD>{s.nama}</TD>
                  <TD>{s.shift}</TD>
                  <TD>{s.jam_mulai} - {s.jam_selesai}</TD>
                  <TD>{s.tanggal}</TD>
                </TR>
              ))}
              {schedules.length === 0 && (
                <TR>
                  <TD colSpan={4} className="text-center py-6 text-[hsl(var(--muted-foreground))]">
                    Belum ada jadwal untuk hari ini
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===== MODAL: BUAT JADWAL BARU ===== */}
      <Modal open={modalAdd} title="Buat Jadwal Baru" onClose={() => setModalAdd(false)}>
        <form onSubmit={createSchedule} className="space-y-4">
          {/* === PEGAWAI === */}
          <div>
            <Label>Pegawai</Label>
            <select
              name="pegawai_id"
              className="ds-input w-full"
              value={pegawaiId}
              onChange={(e) => {
                setPegawaiId(e.target.value);
                e.target.blur();
              }}
              required
            >
              <option value="">Pilih pegawai</option>
              {employeeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FieldError message={scheduleErrors.pegawai_id} />
          </div>

          {/* === SHIFT === */}
          <div>
            <Label>Shift</Label>
            <select
              name="shift"
              defaultValue=""
              required
              className="ds-input w-full"
              onChange={(e) => {
                const shift = e.target.value;
                if (shift && shiftTimes[shift]) {
                  const { jam_mulai, jam_selesai } = shiftTimes[shift];
                  document.querySelector('input[name="jam_mulai"]').value = jam_mulai;
                  document.querySelector('input[name="jam_selesai"]').value = jam_selesai;
                }
                e.target.blur();
              }}
            >
              <option value="" disabled>Pilih shift</option>
              <option value="Pagi">Pagi</option>
              <option value="Siang">Siang</option>
              <option value="Malam">Malam</option>
            </select>
            <small className="text-xs text-gray-500">
              Otomatis isi jam kerja sesuai shift (bisa disesuaikan).
            </small>
            <FieldError message={scheduleErrors.shift} />
          </div>

          {/* === TANGGAL === */}
          <div>
            <Label>Tanggal</Label>
            <Input type="date" name="tanggal" required />
            <FieldError message={scheduleErrors.tanggal} />
          </div>

          {/* === RENTANG WAKTU === */}
          <div>
            <Label>Rentang Waktu</Label>
            <select name="rentang_waktu" defaultValue="1" className="ds-input w-full">
              {rangeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <small className="text-xs text-gray-500">
              Jadwal akan otomatis digandakan tiap hari selama rentang yang dipilih.
            </small>
          </div>

          {/* === JAM MULAI === */}
          <div>
            <Label>Jam Mulai</Label>
            <Input type="time" name="jam_mulai" required />
            <FieldError message={scheduleErrors.jam_mulai} />
          </div>

          {/* === JAM SELESAI === */}
          <div>
            <Label>Jam Selesai</Label>
            <Input type="time" name="jam_selesai" required />
            <FieldError message={scheduleErrors.jam_selesai} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="neutral" onClick={() => setModalAdd(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: VERIFIKASI ABSENSI ===== */}
      <Modal open={modalVerify} title="Verifikasi Absensi" onClose={() => setModalVerify(false)}>
        <Table>
          <THead>
            <TR>
              <TH>Nama Pegawai</TH>
              <TH>Waktu Absen</TH>
              <TH>Status</TH>
              <TH>Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {pendingVerify.map((p) => (
              <TR key={p.id}>
                <TD>{p.nama}</TD>
                <TD>{p.waktu}</TD>
                <TD>{p.status}</TD>
                <TD className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <button
                    onClick={() => openVerifyDetail(p)}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 bg-white shadow-[inset_0_-1px_0_rgba(15,23,42,0.12)] hover:shadow-md transition"
                  >
                    <i className="fa-solid fa-eye" />
                    Detail
                  </button>
                  <button
                    onClick={() => setConfirmVerifyId(p.id)}
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-base font-medium text-[#1f2937] bg-amber-500 hover:bg-amber-400 border border-[#f0a500]/30 transition-colors"
                    title="Verifikasi Absensi"
                  >
                    <i className="fa-solid fa-check" />
                    <span>Verifikasi</span>
                  </button>
                </TD>
              </TR>
            ))}
            {pendingVerify.length === 0 && (
              <TR>
                <TD colSpan={4} className="text-center py-6 text-[hsl(var(--muted-foreground))]">
                  Tidak ada absensi yang perlu diverifikasi
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Modal>

      <Modal
        open={verifyDetailOpen}
        title="Detail Absensi"
        onClose={() => setVerifyDetailOpen(false)}
        maxWidth="max-w-3xl"
      >
        {verifyDetailLoading ? (
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
            Memuat data…
          </p>
        ) : verifyDetail ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">
                  Nama Pegawai
                </p>
                <p className="text-lg font-semibold">{verifyDetail.nama}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {verifyDetail.jabatan || "—"}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Shift</p>
                <p className="text-lg font-semibold">{verifyDetail.shift || "—"}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Status: {verifyDetail.status || "—"}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Tanggal", value: verifyDetail.tanggal || "—" },
                { label: "Jam Masuk", value: verifyDetail.jam_masuk || verifyDetail.waktu || "—" },
                { label: "Jam Keluar", value: verifyDetail.jam_keluar || "Belum tercatat" },
              ].map((field) => (
                <div
                  key={field.label}
                  className="p-4 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30"
                >
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{field.label}</p>
                  <p className="font-medium">{field.value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-dashed border-[hsl(var(--border))] rounded-xl p-4 bg-[hsl(var(--muted))]/20">
                <p className="text-sm font-semibold mb-2">Foto Bukti</p>
                {verifyDetail.foto_url ? (
                  <img
                    src={verifyDetail.foto_url}
                    alt="Bukti absensi"
                    className="rounded-md w-full max-h-64 object-cover"
                  />
                ) : (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Tidak ada foto yang diunggah.
                  </p>
                )}
              </div>
              <div className="border border-dashed border-[hsl(var(--border))] rounded-xl p-4 bg-[hsl(var(--muted))]/20">
                <p className="text-sm font-semibold mb-2">Lokasi / Koordinat</p>
                {verifyDetail.latitude && verifyDetail.longitude ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      Lat: <span className="font-mono">{verifyDetail.latitude}</span>
                      <br />
                      Lng: <span className="font-mono">{verifyDetail.longitude}</span>
                    </p>
                    <a
                      href={`https://maps.google.com/?q=${verifyDetail.latitude},${verifyDetail.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ds-btn ds-btn-outline text-xs"
                    >
                      Buka di Google Maps
                    </a>
                  </div>
                ) : verifyDetail.lokasi ? (
                  <p className="text-sm">{truncate(verifyDetail.lokasi, 80)}</p>
                ) : (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Koordinat atau nama lokasi tidak tersedia.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
            Data absensi tidak ditemukan.
          </p>
        )}
      </Modal>
      <ConfirmActionModal
        open={!!confirmVerifyId}
        title="Verifikasi Absensi"
        message="Yakin ingin memverifikasi absensi ini? Tindakan ini akan mencatat absensi sebagai diverifikasi."
        confirmText="Verifikasi"
        cancelText="Batal"
        onCancel={() => setConfirmVerifyId(null)}
        onConfirm={async () => {
          if (!confirmVerifyId) return;
          await verifyAttendance(confirmVerifyId);
          setConfirmVerifyId(null);
        }}
      />
    </div>
  );
}
const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
      <i className="fa-solid fa-circle-exclamation" />
      {message}
    </p>
  ) : null;

const validateSchedulePayload = (payload = {}) => {
  const errors = {};
  const toMinutes = (time) => {
    if (!time) return null;
    const [h = "0", m = "0"] = time.split(":");
    const hour = Number(h);
    const minute = Number(m);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  };

  if (!payload.pegawai_id) errors.pegawai_id = "Pegawai wajib dipilih.";
  if (!payload.shift) errors.shift = "Shift wajib dipilih.";
  if (!payload.tanggal) {
    errors.tanggal = "Tanggal wajib dipilih.";
  } else {
    const dateValue = new Date(payload.tanggal);
    if (Number.isNaN(dateValue.getTime())) {
      errors.tanggal = "Tanggal tidak valid.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dateValue < today) {
        errors.tanggal = "Tanggal jadwal sudah terlewat. Harap pilih tanggal yang akan datang.";
      }
    }
  }
  if (!payload.jam_mulai) errors.jam_mulai = "Jam mulai wajib diisi.";
  if (!payload.jam_selesai) errors.jam_selesai = "Jam selesai wajib diisi.";

  const startMinutes = toMinutes(payload.jam_mulai);
  const endMinutes = toMinutes(payload.jam_selesai);
  if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
    errors.jam_selesai = "Jam selesai harus lebih besar dari jam mulai.";
  }

  return errors;
};
