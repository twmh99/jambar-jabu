import React from "react";
import SelectSearch from "react-select";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input, Label } from "../../components/ui/input";
import Modal from "../../components/common/Modal";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";

export default function SupervisorDashboard() {
  // ⏱ waktu realtime (sekaligus jadi header seperti di employee)
  const [time, setTime] = React.useState(new Date());

  // ringkasan kecil (dibangun dari /jadwal/today dan /absensi/today)
  const [summary, setSummary] = React.useState({
    activeShifts: 0,
    present: 0,
    late: 0,
  });

  const [schedules, setSchedules] = React.useState([]);
  const [modalAdd, setModalAdd] = React.useState(false);
  const [modalVerify, setModalVerify] = React.useState(false);
  const [pendingVerify, setPendingVerify] = React.useState([]);

  // daftar pegawai untuk dropdown saat membuat jadwal
  const [employees, setEmployees] = React.useState([]);
  const [pegawaiId, setPegawaiId] = React.useState("");

  // 🕒 update jam per detik
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // === LOADERS ===
  const loadEmployees = async () => {
    try {
      const res = await api.get("/pegawai");
      // ✅ ambil data yang benar
      const list = Array.isArray(res.data?.data) ? res.data.data : res.data;
      console.log("Data pegawai dari API:", res.data);
      setEmployees(list || []);
      if (list?.length && !pegawaiId) setPegawaiId(String(list[0].id));
    } catch (err) {
      console.error("Gagal memuat daftar pegawai:", err);
      toast.error("Gagal memuat daftar pegawai");
    }
  };

  const loadSchedules = async () => {
    try {
      const res = await api.get("/jadwal/today");
      setSchedules(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Gagal memuat jadwal hari ini");
    }
  };

  const loadPendingVerify = async () => {
    try {
      const res = await api.get("/absensi/pending");
      setPendingVerify(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Gagal memuat daftar verifikasi");
    }
  };

  const loadSummary = async () => {
    try {
      const [jadwal, absensi] = await Promise.all([
        api.get("/jadwal/today"),
        api.get("/absensi/today"),
      ]);

      const arrJ = Array.isArray(jadwal.data) ? jadwal.data : [];
      const arrA = Array.isArray(absensi.data) ? absensi.data : [];

      const activeShifts = new Set(arrJ.map((x) => x.shift).filter(Boolean)).size;
      const present = arrA.filter((x) => (x.status || "").toLowerCase() === "hadir").length;
      const late = arrA.filter((x) => (x.status || "").toLowerCase() === "terlambat").length;

      setSummary({ activeShifts, present, late });
    } catch {
      // kalau gagal, biarkan nilai tetap
    }
  };

  React.useEffect(() => {
    loadEmployees();
    loadSchedules();
    loadSummary();
  }, []);

  // === ACTIONS ===
  const createSchedule = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());

    const payload = {
      pegawai_id: data.pegawai_id || pegawaiId,
      tanggal: data.tanggal,
      shift: data.shift,
      jam_mulai: data.jam_mulai,
      jam_selesai: data.jam_selesai,
    };

    if (!payload.pegawai_id || !payload.tanggal || !payload.shift || !payload.jam_mulai || !payload.jam_selesai) {
      toast.error("Lengkapi data jadwal!");
      return;
    }

    try {
      await api.post("/jadwal", payload);
      toast.success("Jadwal berhasil dibuat");
      setModalAdd(false);
      await loadSchedules();
      await loadSummary();
    } catch (err) {
      const msg = err?.response?.data?.message || "Gagal membuat jadwal";
      toast.error(msg);
    }
  };

  const verifyAttendance = async (id) => {
    try {
      await api.post(`/absensi/verify/${id}`);
      toast.success("Absensi diverifikasi");
      await loadPendingVerify();
      await loadSummary();
    } catch {
      toast.error("Gagal memverifikasi");
    }
  };

  // jam otomatis per shift
  const shiftTimes = {
    Pagi: { jam_mulai: "09:00", jam_selesai: "14:00" },
    Siang: { jam_mulai: "14:00", jam_selesai: "19:00" },
    Malam: { jam_mulai: "19:00", jam_selesai: "00:00" },
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

      {/* ===== ACTION BUTTONS ===== */}
      <div className="flex justify-end gap-2">
        <Button variant="accent" onClick={() => setModalAdd(true)}>
          <i className="fa-solid fa-plus mr-2" /> Buat Jadwal Baru
        </Button>
        <button
          onClick={() => {
            setModalVerify(true);
            loadPendingVerify();
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
            <SelectSearch
              classNamePrefix="react-select"
              placeholder="Cari nama pegawai..."
              options={employees.map((p) => ({
                value: p.id,
                label: `${p.nama} (${p.jabatan || "Tanpa jabatan"})`,
              }))}
              value={employees.find((e) => e.id === parseInt(pegawaiId))}
              onChange={(option) => setPegawaiId(option?.value || "")}
              isSearchable
            />
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
          </div>

          {/* === TANGGAL === */}
          <div>
            <Label>Tanggal</Label>
            <Input type="date" name="tanggal" required />
          </div>

          {/* === JAM MULAI === */}
          <div>
            <Label>Jam Mulai</Label>
            <Input type="time" name="jam_mulai" required />
          </div>

          {/* === JAM SELESAI === */}
          <div>
            <Label>Jam Selesai</Label>
            <Input type="time" name="jam_selesai" required />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalAdd(false)}>
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
            {pendingVerify.map((p, i) => (
              <TR key={i}>
                <TD>{p.nama}</TD>
                <TD>{p.waktu}</TD>
                <TD>{p.status}</TD>
                <TD>
                <button
                  onClick={() => verifyAttendance(p.id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-green-100 hover:shadow-md hover:shadow-emerald-200/40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-[#1e293b]/80 dark:hover:shadow-emerald-400/30 dark:hover:text-emerald-300 transition-all duration-300"
                  title="Verifikasi Absensi"
                >
                  <i className="fa-solid fa-circle-check text-green-500 dark:text-emerald-400" />
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
    </div>
  );
}
