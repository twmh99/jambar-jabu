import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { LineChart } from "../../components/charts/LineChart";
import { Pie } from "../../components/charts/Pie";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/common/Modal";
import { Input, Label, Select } from "../../components/ui/input";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";
import {
  validateEmployeeData,
  normalizeBackendErrors,
  firstErrorMessage,
} from "../../utils/validation";

const ROLE_RATE_MAP = {
  Supervisor: 30000,
  Koki: 27000,
  Kasir: 25000,
  Pelayan: 23000,
  "Tukang Kebun": 20000,
};
const JABATAN_OPTIONS = [
  "Supervisor",
  "Koki",
  "Kasir",
  "Pelayan",
  "Tukang Kebun",
];
const normalizeJabatanOption = (jabatan) => {
  if (!jabatan) return JABATAN_OPTIONS[0];
  const found = JABATAN_OPTIONS.find(
    (opt) => opt.toLowerCase() === jabatan.toLowerCase().trim()
  );
  return found || JABATAN_OPTIONS[0];
};
const deriveRoleFromJabatan = (jabatan) =>
  jabatan === "Supervisor" ? "supervisor" : "employee";
const deriveRoleLabel = (jabatan) =>
  jabatan === "Supervisor" ? "Supervisor" : "Pegawai";

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
      <i className="fa-solid fa-circle-exclamation" />
      {message}
    </p>
  ) : null;

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
  const [editId, setEditId] = React.useState(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [shiftStats, setShiftStats] = React.useState([]);
  const [selectedJabatan, setSelectedJabatan] = React.useState(
    JABATAN_OPTIONS[0]
  );
  const [employeeFormErrors, setEmployeeFormErrors] = React.useState({});
  const hourlyRateRef = React.useRef(null);
  const nav = useNavigate();
  const normalizeStr = (value = "") => value?.toString().trim();
  const normalizeEmail = (value = "") => normalizeStr(value).toLowerCase();
  const editingPegawai = React.useMemo(
    () =>
      editId
        ? employees.find((emp) => emp.id === editId) || null
        : null,
    [editId, employees]
  );
  const trendChartData = React.useMemo(() => {
    if (!Array.isArray(summary.tren_kehadiran)) return [];
    return summary.tren_kehadiran.slice(-8).map((item, idx) => {
      const labelRaw = item.label || "";
      const [weekPartRaw, dateRangeRaw] = labelRaw
        .split("•")
        .map((part) => part?.trim());
      const weekShort = weekPartRaw
        ? weekPartRaw.replace(/Minggu/i, "Mg")
        : `Mg ${idx + 1}`;
      const dateShort = dateRangeRaw?.replace(/\s+-\s+/g, " – ");
      const axisLabel = [weekShort, dateShort].filter(Boolean).join("\n");
      return {
        axisLabel,
        tooltip: labelRaw || weekShort,
        value: item.value ?? 0,
      };
    });
  }, [summary.tren_kehadiran]);

  /** 🔁 Load data dashboard (summary + pegawai) */
  const load = async () => {
    setLoading(true);
    try {
      const [summaryRes, empRes, shiftRes] = await Promise.all([
        api.get("/dashboard/summary"), // ganti endpoint sesuai backend Laravel
        api.get("/pegawai"),
        api.get("/jadwal/week"),
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

      const shiftRaw = Array.isArray(shiftRes.data)
        ? shiftRes.data
        : Array.isArray(shiftRes.data?.data)
          ? shiftRes.data.data
          : [];
      const counts = shiftRaw.reduce((acc, item) => {
        const label = item.shift || "Tanpa shift";
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {});
      let computedShift = Object.entries(counts).map(([label, value]) => ({
        label,
        value,
      }));
      if (
        !computedShift.length &&
        Array.isArray(summaryData.komposisi_shift) &&
        summaryData.komposisi_shift.length
      ) {
        computedShift = summaryData.komposisi_shift.map((item, idx) => {
          const isObject = item && typeof item === "object";
          const label = isObject
            ? item.shift || item.label || `Shift ${idx + 1}`
            : `Shift ${idx + 1}`;
          const valueRaw = isObject ? item.jumlah ?? item.value ?? 0 : item;
          return {
            label,
            value: Number(valueRaw) || 0,
          };
        });
      }

      computedShift = computedShift.filter((entry) => entry.value > 0);

      setSummary(summaryData);
      setEmployees(employeeList);
      setShiftStats(computedShift);
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

  React.useEffect(() => {
    if (!open) return;
    const preset =
      ROLE_RATE_MAP[selectedJabatan] ?? ROLE_RATE_MAP.Supervisor ?? 20000;
    if (hourlyRateRef.current && !editId) {
      hourlyRateRef.current.value = preset;
    }
  }, [open, selectedJabatan, editId]);

  React.useEffect(() => {
    if (!open) {
      setEmployeeFormErrors({});
    }
  }, [open]);

  /** ➕ Tambah Pegawai */
  const addEmployee = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    const isEdit = Boolean(editId);
    const normalizedJabatan = normalizeJabatanOption(
      data.jabatan || selectedJabatan
    );
    const payload = {
      nama: data.nama,
      jabatan: normalizedJabatan,
      telepon: data.telepon,
      email: data.email,
      hourly_rate: data.hourly_rate,
    };

    const formValidation = validateEmployeeData(payload);
    if (Object.keys(formValidation).length > 0) {
      setEmployeeFormErrors(formValidation);
      const firstMsg = firstErrorMessage(formValidation) || "Semua field wajib diisi.";
      toast.error(firstMsg);
      return;
    }
    setEmployeeFormErrors({});

    const resolvedHourly =
      Number(data.hourly_rate) ||
      ROLE_RATE_MAP[normalizedJabatan] ||
      ROLE_RATE_MAP.Supervisor ||
      20000;

    if (isEdit && editingPegawai) {
      const incoming = {
        nama: normalizeStr(payload.nama),
        jabatan: normalizedJabatan,
        telepon: normalizeStr(payload.telepon),
        email: normalizeEmail(payload.email),
        status: data.status || "Aktif",
        hourly_rate: resolvedHourly,
        role: deriveRoleFromJabatan(normalizedJabatan),
      };

      const existing = {
        nama: normalizeStr(editingPegawai.nama),
        jabatan: editingPegawai.jabatan,
        telepon: normalizeStr(editingPegawai.telepon),
        email: normalizeEmail(editingPegawai.email),
        status: editingPegawai.status || "Aktif",
        hourly_rate:
          Number(editingPegawai.hourly_rate ?? 0) ||
          ROLE_RATE_MAP[editingPegawai.jabatan] ||
          ROLE_RATE_MAP.Supervisor ||
          20000,
        role: deriveRoleFromJabatan(editingPegawai.jabatan),
      };

      const isSame = Object.keys(incoming).every(
        (key) => incoming[key] === existing[key]
      );
      if (isSame) {
        toast.info("Tidak ada perubahan yang disimpan.");
        setOpen(false);
        setEditId(null);
        e.target.reset();
        return;
      }
    }

    try {
      setLoading(true);
      if (editId) {
        await api.put(`/pegawai/${editId}`, {
          nama: normalizeStr(payload.nama),
          jabatan: normalizedJabatan,
          telepon: normalizeStr(payload.telepon),
          status: data.status || "Aktif",
          hourly_rate: resolvedHourly,
          email: normalizeEmail(payload.email),
          role: deriveRoleFromJabatan(normalizedJabatan),
        });
        toast.success(`Pegawai "${payload.nama}" berhasil diperbarui.`);
      } else {
        await api.post("/pegawai", {
          nama: payload.nama,
          jabatan: normalizedJabatan,
          telepon: payload.telepon,
          email: payload.email,
          role: deriveRoleFromJabatan(normalizedJabatan),
          status: data.status || "Aktif",
          hourly_rate: resolvedHourly,
        });
        toast.success(`Pegawai "${payload.nama}" berhasil ditambahkan.`);
      }
      setOpen(false);
      setEditId(null);
      setSelectedJabatan(JABATAN_OPTIONS[0]);
      setEmployeeFormErrors({});
      // removed general error state
      e.target.reset();
      load();
    } catch (err) {
      console.error("Tambah pegawai error:", err.response?.data || err.message);
      const backend = normalizeBackendErrors(err?.response?.data?.errors);
      if (Object.keys(backend).length) {
        setEmployeeFormErrors(backend);
        const firstMsg = firstErrorMessage(backend);
        toast.error(firstMsg || "Gagal menambah pegawai");
      } else {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Gagal menambah pegawai";
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  /** 👁️ Lihat detail pegawai */
  const showDetail = async (pegawai) => {
    try {
      const res = await api.get(`/pegawai/profil/${pegawai.id}`);
      const detail = res.data?.data || pegawai;
      setSelectedPegawai(detail);
      setSelectedJabatan(normalizeJabatanOption(detail.jabatan));
      setDetailOpen(true);
    } catch (err) {
      console.warn("Gagal memuat profil lengkap:", err.message);
      setSelectedPegawai(pegawai);
      setSelectedJabatan(normalizeJabatanOption(pegawai.jabatan));
      setDetailOpen(true);
    }
  };

  /** Data pie komposisi shift */
  const pieValues = React.useMemo(
    () => shiftStats.map((item) => item.value),
    [shiftStats]
  );
  const pieLabels = React.useMemo(
    () => shiftStats.map((item) => item.label),
    [shiftStats]
  );


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
            path: "/owner/employees",
          },
          {
            label: "Absensi Bulan Ini",
            value: summary.absensi_bulan_ini,
            icon: "fa-calendar-check",
            color: "success",
            path: "/owner/attendance",
          },
          {
            label: "Total Gaji (IDR)",
            value: new Intl.NumberFormat("id-ID").format(
              summary.total_gaji || 0
            ),
            icon: "fa-sack-dollar",
            color: "warning",
            path: "/owner/payroll",
          },
        ].map((stat, i) => (
          <button
            key={i}
            type="button"
            onClick={() => stat.path && nav(stat.path)}
            className="text-left rounded-[22px] border border-[hsl(var(--border))] shadow-[0px_10px_25px_rgba(15,23,42,0.1)] hover:shadow-[0px_16px_35px_rgba(15,23,42,0.18)] transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
          >
            <div className="flex flex-col gap-4 p-5">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{stat.label}</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-semibold text-[hsl(var(--foreground))]">
                  {loading ? "..." : stat.value}
                </h3>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center bg-[hsl(var(--${stat.color}))/0.15] text-[hsl(var(--${stat.color}))] text-xl`}
                  aria-hidden
                >
                  <i className={`fa-solid ${stat.icon}`} />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ===== Grafik Tren & Komposisi ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
            <CardTitle className="text-[hsl(var(--foreground))] font-semibold">
              Tren Kehadiran Mingguan
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => nav("/owner/attendance")}
              className="hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--primary))] dark:hover:text-[hsl(var(--foreground))]"
            >
              <i className="fa-solid fa-table-list mr-2" />
              Lihat Laporan
            </Button>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-2 sm:px-4 lg:px-6">
            <div className="w-full">
              {trendChartData.length > 0 ? (
                <LineChart data={trendChartData} height={220} width={640} />
              ) : (
                <p className="text-[hsl(var(--muted-foreground))] text-sm">Belum ada data kehadiran</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-[hsl(var(--foreground))] font-semibold">
              Komposisi Shift
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => nav("/owner/analytics")}
              className="hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--primary))] dark:hover:text-[hsl(var(--foreground))] w-full sm:w-auto whitespace-nowrap justify-center"
            >
              <i className="fa-solid fa-chart-simple mr-2" />
              Analitik
            </Button>
          </CardHeader>
          <CardContent className="flex items-start justify-start">
            {pieValues.length > 0 ? (
              <Pie
                values={pieValues}
                labels={pieLabels}
                colors={[
                  "hsl(var(--foreground))", // selaraskan dengan judul card
                  "hsl(var(--pie-2))",
                  "hsl(var(--pie-3))",
                ]}
                legendSide
                size={180}
              />
            ) : (
              <p className="text-[hsl(var(--muted-foreground))] text-sm">Belum ada data shift</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Daftar Pegawai ===== */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-[hsl(var(--foreground))] font-semibold">
            Daftar Pegawai
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={load}
              disabled={loading}
              className="whitespace-nowrap dark:border-[hsl(var(--border))] dark:text-[hsl(var(--foreground))]"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin mr-2" /> Memuat...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-arrows-rotate mr-2" /> Refresh
                </>
              )}
            </Button>
            <Button
              variant="accent"
              onClick={() => setOpen(true)}
              className="bg-[hsl(var(--accent))] text-[hsl(var(--primary))] hover:bg-yellow-400"
            >
              <i className="fa-solid fa-user-plus mr-2" /> Tambah Pegawai
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH className="text-[hsl(var(--foreground))]">Nama</TH>
                <TH className="text-[hsl(var(--foreground))]">Jabatan</TH>
                <TH className="text-[hsl(var(--foreground))]">Telepon</TH>
                <TH className="text-[hsl(var(--foreground))]">Status</TH>
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
                    <TD className="text-[hsl(var(--foreground))]">{e.nama}</TD>
                    <TD className="text-[hsl(var(--foreground))]">{e.jabatan}</TD>
                    <TD className="text-[hsl(var(--foreground))]">{e.telepon || "-"}</TD>
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

      {/* ===== Modal Tambah / Edit Pegawai ===== */}
      <Modal
        open={open}
        title={editId ? "Edit Pegawai" : "Tambah Pegawai"}
        onClose={() => {
          setOpen(false);
          setEditId(null);
          setEmployeeFormErrors({});
        }}
      >
        <form
          key={editId || "new"}
          onSubmit={addEmployee}
          noValidate
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="sm:col-span-2">
            <Label>Nama</Label>
            <Input
              name="nama"
              required
              requiredMessage="Nama wajib diisi."
              defaultValue={editId ? selectedPegawai?.nama : ""}
            />
            <FieldError message={employeeFormErrors.nama} />
          </div>
          <div>
            <Label>Jabatan</Label>
            <Select
              name="jabatan"
              value={selectedJabatan}
              onChange={(e) => setSelectedJabatan(e.target.value)}
              required
              data-testid="jabatan-owner-edit"
            >
              {JABATAN_OPTIONS.map((jab) => (
                <option key={jab} value={jab}>
                  {jab}
                </option>
              ))}
            </Select>
            <FieldError message={employeeFormErrors.jabatan} />
          </div>
          <div>
            <Label>Telepon</Label>
            <Input
              name="telepon"
              required
              requiredMessage="Telepon wajib diisi."
              defaultValue={editId ? selectedPegawai?.telepon : ""}
            />
            <FieldError message={employeeFormErrors.telepon} />
          </div>
          <div>
            <Label>Email (Login)</Label>
            <Input
              type="email"
              name="email"
              required
              requiredMessage="Email wajib diisi."
              defaultValue={editId ? selectedPegawai?.email : ""}
            />
            <FieldError message={employeeFormErrors.email} />
          </div>
          <div>
            <Label>Role</Label>
            <Input
              value={deriveRoleLabel(selectedJabatan)}
              readOnly
              className="bg-[hsl(var(--muted))]"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              name="status"
              defaultValue={editId ? selectedPegawai?.status || "Aktif" : "Aktif"}
            >
              <option>Aktif</option>
              <option>Nonaktif</option>
            </Select>
          </div>
          <div>
            <Label>Tarif/Jam (IDR)</Label>
            <Input
              type="number"
              name="hourly_rate"
              min="0"
              step="1000"
              ref={hourlyRateRef}
              required
              requiredMessage="Tarif/Jam wajib diisi."
              defaultValue={
                editId
                  ? selectedPegawai?.hourly_rate || ROLE_RATE_MAP.Supervisor
                  : ROLE_RATE_MAP.Supervisor
              }
            />
            <FieldError message={employeeFormErrors.hourly_rate} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="neutral"
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
          <div className="space-y-6 text-[15px]">
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#0ea5e9] flex items-center justify-center text-white text-3xl font-semibold shadow-lg">
              {selectedPegawai.nama?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{selectedPegawai.nama}</h2>
              <p className="text-[hsl(var(--muted-foreground))]">
                {selectedPegawai.jabatan || "—"}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDetailOpen(false);
                setEditId(selectedPegawai.id);
                setSelectedJabatan(selectedPegawai.jabatan || JABATAN_OPTIONS[0]);
                setOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-2 px-4"
            >
              <i className="fa-solid fa-pen" />
              Edit
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Telepon", value: selectedPegawai.telepon || "-" },
                { label: "Email", value: selectedPegawai.email || "-" },
                {
                  label: "Role",
                  value: (() => {
                    const rawRole = (selectedPegawai.role || "").toString().toLowerCase();
                    if (rawRole === "employee") return "Pegawai";
                    if (rawRole === "supervisor") return "Supervisor";
                    if (rawRole === "owner") return "Owner";
                    return rawRole || "-";
                  })(),
                },
                {
                  label: "Status",
                  value: (
                    <span
                      className={`ds-badge ${
                        selectedPegawai.status === "Aktif"
                          ? "bg-[hsl(var(--success))] text-white"
                          : "bg-[hsl(var(--muted))]"
                      }`}
                    >
                      {selectedPegawai.status || "-"}
                    </span>
                  ),
                },
              ].map((field, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border bg-[hsl(var(--card))] shadow-sm flex flex-col gap-1"
                >
                  <span className="text-xs font-semibold tracking-wide text-gray-500">
                    {field.label}
                  </span>
                  <span className="text-[hsl(var(--foreground))]">{field.value}</span>
                </div>
              ))}
              <div className="sm:col-span-2 p-4 rounded-xl border bg-[hsl(var(--card))] shadow-sm flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wide text-gray-500">
                  Tarif/Jam
                </span>
                <span>
                  Rp{" "}
                  {selectedPegawai.hourly_rate
                    ? selectedPegawai.hourly_rate.toLocaleString("id-ID")
                    : "0"}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="btn-neutral"
                onClick={() => setDetailOpen(false)}
              >
                Tutup
              </button>
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
