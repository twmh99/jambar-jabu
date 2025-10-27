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
    total_employees: 0,
    attendance_this_month: 0,
    total_payroll: 0,
    attendance_trend: [],
    shift_composition: {},
  });
  const [employees, setEmployees] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const nav = useNavigate();

  // ubah object shift_composition jadi array {label, value}
  const pieData = React.useMemo(() => {
    const obj = summary.shift_composition || {};
    return Object.entries(obj).map(([label, value]) => ({ label, value }));
  }, [summary.shift_composition]);

  /** 🔁 Load data dashboard */
  const load = async () => {
    setLoading(true);
    try {
      const [summaryRes, empRes] = await Promise.all([
        api.get("/laporan/owner-summary"),
        api.get("/pegawai"),
      ]);
      // backend bisa return {data: {...}} atau {...} → keduanya di-handle
      setSummary(summaryRes.data?.data || summaryRes.data);
      const list = Array.isArray(empRes.data)
        ? empRes.data
        : Array.isArray(empRes.data?.data)
        ? empRes.data.data
        : [];
      setEmployees(list);
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

  /** ➕ Quick Add Pegawai */
  const quickAdd = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    if (!data.nama || !data.jabatan || !data.telepon || !data.email) {
      toast.error("Lengkapi nama, jabatan, telepon, dan email.");
      return;
    }
    try {
      await api.post("/pegawai", {
        nama: data.nama,
        jabatan: data.jabatan,
        telepon: data.telepon,
        status: data.status || "Aktif",
        hourly_rate: Number(data.hourly_rate || 20000),
        email: data.email,
        role: data.role || "employee",
      });
      toast.success("Pegawai berhasil ditambahkan");
      setOpen(false);
      e.currentTarget.reset();
      load();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Gagal menambah pegawai";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ===== Statistik singkat ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            label: "Total Pegawai",
            value: summary.total_employees,
            icon: "fa-users",
            color: "accent",
          },
          {
            label: "Absensi Bulan Ini",
            value: summary.attendance_this_month,
            icon: "fa-calendar-check",
            color: "success",
          },
          {
            label: "Total Gaji (IDR)",
            value: new Intl.NumberFormat("id-ID").format(
              summary.total_payroll || 0
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
        {/* Tren Kehadiran */}
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
            <Sparkline data={summary.attendance_trend || []} />
          </CardContent>
        </Card>

        {/* Komposisi Shift */}
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
            <Pie
              values={pieData}
              colors={[
                "hsl(var(--accent))",
                "hsl(var(--primary))",
                "hsl(var(--muted-foreground))",
              ]}
            />
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
                    className="hover:bg-[hsl(var(--muted))]/20 transition-colors"
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

      {/* ===== Modal Tambah Cepat ===== */}
      <Modal
        open={open}
        title="Tambah Pegawai Cepat"
        onClose={() => setOpen(false)}
      >
        <form
          onSubmit={quickAdd}
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
            <Label>Status</Label>
            <Select name="status" defaultValue="Aktif">
              <option>Aktif</option>
              <option>Nonaktif</option>
            </Select>
          </div>
          <div>
            <Label>Tarif/Jam (IDR)</Label>
            <Input
              type="number"
              name="hourly_rate"
              defaultValue={20000}
              min="0"
              step="1000"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Email (Login)</Label>
            <Input type="email" name="email" required />
          </div>
          <div className="sm:col-span-2">
            <Label>Role</Label>
            <Select name="role" defaultValue="employee">
              <option value="employee">Pegawai</option>
              <option value="supervisor">Supervisor</option>
              <option value="owner">Owner</option>
            </Select>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="ds-btn ds-btn-outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </button>
            <Button
              type="submit"
              className="bg-[hsl(var(--accent))] text-[hsl(var(--primary))] hover:bg-yellow-400"
            >
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
