import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input, Label, Select } from "../../components/ui/input";
import Modal from "../../components/common/Modal";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";

export default function SupervisorDashboard() {
  const [today, setToday] = React.useState("");
  const [summary, setSummary] = React.useState({
    activeShifts: 0,
    present: 0,
    late: 0,
  });
  const [schedules, setSchedules] = React.useState([]);
  const [modalAdd, setModalAdd] = React.useState(false);
  const [modalVerify, setModalVerify] = React.useState(false);
  const [pendingVerify, setPendingVerify] = React.useState([]);

  // ⏰ format tanggal
  const formatDate = () => {
    const date = new Date();
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const loadSummary = async () => {
    try {
      const res = await api.get("attendance/summary/today");
      setSummary(res.data);
    } catch {
      toast.error("Gagal memuat ringkasan hari ini");
    }
  };

  const loadSchedules = async () => {
    try {
      const res = await api.get("schedules/today");
      setSchedules(res.data);
    } catch {
      toast.error("Gagal memuat jadwal hari ini");
    }
  };

  const loadPendingVerify = async () => {
    try {
      const res = await api.get("attendance/pending");
      setPendingVerify(res.data);
    } catch {
      toast.error("Gagal memuat daftar verifikasi");
    }
  };

  React.useEffect(() => {
    setToday(formatDate());
    loadSummary();
    loadSchedules();
  }, []);

  const createSchedule = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    if (!data.employee_id || !data.shift) {
      toast.error("Lengkapi data jadwal!");
      return;
    }
    try {
      await api.post("schedules", data);
      toast.success("Jadwal berhasil dibuat");
      setModalAdd(false);
      await loadSchedules();
      await loadSummary();
    } catch {
      toast.error("Gagal membuat jadwal");
    }
  };

  const verifyAttendance = async (id) => {
    try {
      await api.post(`attendance/verify/${id}`);
      toast.success("Absensi diverifikasi");
      await loadPendingVerify();
      await loadSummary();
    } catch {
      toast.error("Gagal memverifikasi");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kamis, {today}</h1>
        <div className="flex gap-2">
          <Button variant="accent" onClick={() => setModalAdd(true)}>
            <i className="fa-solid fa-plus mr-2" /> Buat Jadwal Baru
          </Button>
          <Button variant="outline" onClick={() => { setModalVerify(true); loadPendingVerify(); }}>
            <i className="fa-regular fa-clipboard-check mr-2" /> Verifikasi Absensi
          </Button>
        </div>
      </div>

      {/* ====== SUMMARY ====== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Shift Aktif Hari Ini
            </div>
            <div className="text-4xl font-semibold text-[hsl(var(--primary))]">
              {summary.activeShifts}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Pegawai Hadir
            </div>
            <div className="text-4xl font-semibold text-[hsl(var(--success))]">
              {summary.present || "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Pegawai Terlambat
            </div>
            <div className="text-4xl font-semibold text-[hsl(var(--warning))]">
              {summary.late || "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ====== TODAY'S SCHEDULE ====== */}
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

      {/* ====== MODAL ADD SCHEDULE ====== */}
      <Modal open={modalAdd} title="Buat Jadwal Baru" onClose={() => setModalAdd(false)}>
        <form onSubmit={createSchedule} className="space-y-4">
          <div>
            <Label>Nama Pegawai</Label>
            <Input name="employee_id" placeholder="Masukkan Nama Pegawai" required />
          </div>
          <div>
            <Label>Shift</Label>
            <Select name="shift" required>
              <option value="">Pilih shift</option>
              <option value="Pagi">Pagi</option>
              <option value="Siang">Siang</option>
              <option value="Malam">Malam</option>
            </Select>
          </div>
          <div>
            <Label>Tanggal</Label>
            <Input type="date" name="tanggal" required />
          </div>
          <div>
            <Label>Jam Mulai</Label>
            <Input type="time" name="jam_mulai" required />
          </div>
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

      {/* ====== MODAL VERIFY ATTENDANCE ====== */}
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
                  <Button
                    variant="accent"
                    onClick={() => verifyAttendance(p.id)}
                    className="text-sm"
                  >
                    <i className="fa-solid fa-check mr-1" /> Verifikasi
                  </Button>
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
