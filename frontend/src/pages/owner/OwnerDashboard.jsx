import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Sparkline } from "../../components/charts/Sparkline";
import { Pie } from "../../components/charts/Pie";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/common/Modal";
import { Input, Label, Select } from "../../components/ui/input";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";

export default function OwnerDashboard() {
  const [summary, setSummary] = React.useState({
    total_pegawai: 0,
    absensi_bulan_ini: 0,
    total_gaji: 0,
    tren_kehadiran: [],
    komposisi_shift: [],
  });
  const [employees, setEmployees] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [selectedPegawai, setSelectedPegawai] = React.useState(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const nav = useNavigate();

  /** 🔁 Load data dashboard (summary + pegawai) */
  const load = async () => {
    setLoading(true);
    try {
      const [summaryRes, empRes] = await Promise.all([
        api.get("/dashboard/summary"), // ganti endpoint sesuai backend Laravel
        api.get("/pegawai"),
      ]);

      const summaryData =
        summaryRes.data?.data ||
        summaryRes.data ||
        {
          total_pegawai: 0,
          absensi_bulan_ini: 0,
          total_gaji: 0,
          tren_kehadiran: [],
          komposisi_shift: [],
        };

      const employeeList = Array.isArray(empRes.data)
        ? empRes.data
        : Array.isArray(empRes.data?.data)
        ? empRes.data.data
        : [];

      setSummary(summaryData);
      setEmployees(employeeList);
    } catch (err) {
      console.error("Dashboard load error:", err.response?.data || err.message);
      toast.error("Gagal memuat data dashboard");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  /** ➕ Tambah Pegawai */
  const addEmployee = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());

    if (!data.nama || !data.jabatan || !data.telepon || !data.email) {
      toast.error("Lengkapi nama, jabatan, telepon, dan email!");
      return;
    }

    try {
      setLoading(true);
      await api.post("/pegawai", {
        nama: data.nama,
        jabatan: data.jabatan,
        telepon: data.telepon,
        email: data.email,
        role: data.role || "employee",
        status: data.status || "Aktif",
        hourly_rate: Number(data.hourly_rate || 20000),
      });
      toast.success(`Pegawai "${data.nama}" berhasil ditambahkan.`);
      setOpen(false);
      e.target.reset();
      load();
    } catch (err) {
      console.error("Tambah pegawai error:", err.response?.data || err.message);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Gagal menambah pegawai";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /** 👁️ Lihat detail pegawai */
  const showDetail = async (pegawai) => {
    try {
      const res = await api.get(`/pegawai/profil/${pegawai.id}`);
      setSelectedPegawai(res.data?.data || pegawai);
      setDetailOpen(true);
    } catch (err) {
      console.warn("Gagal memuat profil lengkap:", err.message);
      setSelectedPegawai(pegawai);
      setDetailOpen(true);
    }
  };

  /** Data pie komposisi shift */
  const pieData = React.useMemo(() => {
    if (Array.isArray(summary.komposisi_shift)) return summary.komposisi_shift;
    if (typeof summary.komposisi_shift === "object") {
      return Object.entries(summary.komposisi_shift).map(([label, value]) => ({
        label,
        value,
      }));
    }
    return [];
  }, [summary.komposisi_shift]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ===== Statistik singkat ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            label: "Total Pegawai",
            value: summary.total_pegawai,
            icon: "fa-users",
            color: "accent",
          },
          {
            label: "Absensi Bulan Ini",
            value: summary.absensi_bulan_ini,
            icon: "fa-calendar-check",
            color: "success",
          },
          {
            label: "Total Gaji (IDR)",
            value: new Intl.NumberFormat("id-ID").format(
              summary.total_gaji || 0
            ),
            icon: "fa-sack-dollar",
            color: "warning",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className={`bg-white shadow-md p-6 rounded-xl border-l-4 border-[hsl(var(--${stat.color}))] hover:shadow-lg transition-all`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <h3 className="text-3xl font-semibold mt-1 text-[hsl(var(--primary))]">
                  {loading ? "..." : stat.value}
                </h3>
              </div>
              <div
                className={`text-3xl text-[hsl(var(--${stat.color}))]`}
                aria-hidden
              >
                <i className={`fa-solid ${stat.icon}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Grafik Tren & Komposisi ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-[hsl(var(--primary))] font-semibold">
              Tren Kehadiran Mingguan
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => nav("/owner/attendance")}
              className="hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--primary))]"
            >
              <i className="fa-solid fa-table-list mr-2" />
              Lihat Laporan
            </Button>
          </CardHeader>
          <CardContent>
            {summary.tren_kehadiran?.length > 0 ? (
              <Sparkline data={summary.tren_kehadiran} />
            ) : (
              <p className="text-gray-400 text-sm">Belum ada data kehadiran</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-[hsl(var(--primary))] font-semibold">
              Komposisi Shift
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => nav("/owner/analytics")}
              className="hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--primary))]"
            >
              <i className="fa-solid fa-chart-simple mr-2" />
              Analitik
            </Button>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {pieData.length > 0 ? (
              <Pie
                values={pieData}
                colors={[
                  "hsl(var(--accent))",
                  "hsl(var(--primary))",
                  "hsl(var(--muted-foreground))",
                ]}
              />
            ) : (
              <p className="text-gray-400 text-sm">Belum ada data shift</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Daftar Pegawai ===== */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-[hsl(var(--primary))] font-semibold">
            Daftar Pegawai
          </CardTitle>
          <Button
            variant="accent"
            onClick={() => setOpen(true)}
            className="bg-[hsl(var(--accent))] text-[hsl(var(--primary))] hover:bg-yellow-400"
          >
            <i className="fa-solid fa-user-plus mr-2" /> Tambah Pegawai
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>Nama</TH>
                <TH>Jabatan</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {employees.length > 0 ? (
                employees.map((e) => (
                  <TR
                    key={e.id}
                    onClick={() => showDetail(e)}
                    className="hover:bg-[hsl(var(--muted))]/20 cursor-pointer transition-all"
                  >
                    <TD className="font-mono text-xs text-gray-500">{e.id}</TD>
                    <TD>{e.nama}</TD>
                    <TD>{e.jabatan}</TD>
                    <TD>
                      <span
                        className={
                          e.status === "Aktif"
                            ? "ds-badge bg-[hsl(var(--success))] text-white"
                            : "ds-badge bg-[hsl(var(--muted))]"
                        }
                      >
                        {e.status}
                      </span>
                    </TD>
                  </TR>
                ))
              ) : (
                <TR>
                  <TD colSpan={4} className="py-6 text-center text-gray-400">
                    Tidak ada data pegawai
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===== Modal Tambah Pegawai ===== */}
      <Modal open={open} title="Tambah Pegawai" onClose={() => setOpen(false)}>
        <form
          onSubmit={addEmployee}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="sm:col-span-2">
            <Label>Nama</Label>
            <Input name="nama" required />
          </div>
          <div>
            <Label>Jabatan</Label>
            <Input name="jabatan" required />
          </div>
          <div>
            <Label>Telepon</Label>
            <Input name="telepon" required />
          </div>
          <div>
            <Label>Email (Login)</Label>
            <Input type="email" name="email" required />
          </div>
          <div>
            <Label>Role</Label>
            <Select name="role" defaultValue="employee">
              <option value="employee">Pegawai</option>
              <option value="supervisor">Supervisor</option>
              <option value="owner">Owner</option>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue="Aktif">
              <option>Aktif</option>
              <option>Nonaktif</option>
            </Select>
          </div>
          <div>
            <Label>Tarif/Jam (IDR)</Label>
            <Input type="number" name="hourly_rate" defaultValue={20000} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===== Modal Detail Pegawai ===== */}
      <Modal
        open={detailOpen}
        title="Detail Pegawai"
        onClose={() => setDetailOpen(false)}
      >
        {selectedPegawai ? (
          <div className="max-h-[70vh] overflow-y-auto space-y-5 text-[15px]">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#06b6d4] flex items-center justify-center text-white text-3xl font-semibold shadow-lg">
                {selectedPegawai.nama?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <h2 className="mt-3 text-lg font-semibold">
                {selectedPegawai.nama}
              </h2>
              <p className="text-[hsl(var(--muted-foreground))]">
                {selectedPegawai.jabatan || "—"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                <strong className="block text-xs text-gray-500">Telepon</strong>
                <span>{selectedPegawai.telepon || "-"}</span>
              </div>
              <div className="p-3 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                <strong className="block text-xs text-gray-500">Email</strong>
                <span>{selectedPegawai.email || "-"}</span>
              </div>
              <div className="p-3 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                <strong className="block text-xs text-gray-500">Role</strong>
                <span className="capitalize">
                  {selectedPegawai.role || "-"}
                </span>
              </div>
              <div className="p-3 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                <strong className="block text-xs text-gray-500">Status</strong>
                <span
                  className={`ds-badge ${
                    selectedPegawai.status === "Aktif"
                      ? "bg-[hsl(var(--success))] text-white"
                      : "bg-[hsl(var(--muted))]"
                  }`}
                >
                  {selectedPegawai.status}
                </span>
              </div>
              <div className="sm:col-span-2 p-3 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                <strong className="block text-xs text-gray-500">
                  Tarif/Jam
                </strong>
                <span>
                  Rp {selectedPegawai.hourly_rate?.toLocaleString("id-ID") || 0}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-6">
            Memuat detail pegawai...
          </p>
        )}
      </Modal>
    </div>
  );
}
