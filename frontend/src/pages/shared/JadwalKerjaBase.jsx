import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input, Label } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import Modal from "../../components/common/Modal";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";
import SearchInput from "../../components/common/SearchInput";
import { normalizeBackendErrors, firstErrorMessage } from "../../utils/validation";

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

export default function JadwalKerjaBase({ role = "supervisor" }) {
    const [rows, setRows] = React.useState([]);
    const [employees, setEmployees] = React.useState([]);
    const [employeeMap, setEmployeeMap] = React.useState({});
    const [pegawaiId, setPegawaiId] = React.useState("");
    const [selectedEdit, setSelectedEdit] = React.useState(null);
    const [modalAdd, setModalAdd] = React.useState(false);
    const [modalEdit, setModalEdit] = React.useState(false);
    const [q, setQ] = React.useState("");
    const [filterPegawaiId, setFilterPegawaiId] = React.useState("");
    const [filterMode, setFilterMode] = React.useState("all");
    const [filterDate, setFilterDate] = React.useState(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.toISOString().split("T")[0];
    });
    const [pageIndex, setPageIndex] = React.useState(0);

    // 🌟 Tambahan untuk detail modal
    const [selectedDetail, setSelectedDetail] = React.useState(null);
    const [modalDetail, setModalDetail] = React.useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState(null);
    const [scheduleErrors, setScheduleErrors] = React.useState({});
    const [editErrors, setEditErrors] = React.useState({});
    const closeEditModal = () => {
        setModalEdit(false);
        setSelectedEdit(null);
        setEditErrors({});
    };

    // Preset rentang dan shift otomatis
    const rangeOptions = [
        { value: 1, label: "Hanya tanggal ini (1 hari)" },
        { value: 7, label: "Selama 1 minggu (7 hari)" },
        { value: 14, label: "Selama 2 minggu (14 hari)" },
        { value: 30, label: "Selama 1 bulan (30 hari)" },
    ];

    const shiftTimes = {
        Pagi: { jam_mulai: "09:00", jam_selesai: "14:00" },
        Siang: { jam_mulai: "14:00", jam_selesai: "19:00" },
        Malam: { jam_mulai: "19:00", jam_selesai: "00:00" },
    };

    const formatDate = (date) => {
        const d = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
    };
    const toDate = (dateString) => {
        const d = new Date(dateString);
        d.setHours(0, 0, 0, 0);
        return d;
    };
    const startOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay() === 0 ? 6 : d.getDay() - 1; // Monday = 0
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    };
    const endOfWeek = (date) => {
        const d = new Date(date);
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
        return d;
    };
    const formatWeekRange = (start, end) => {
        const formatter = new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
        return `${formatter.format(start)} - ${formatter.format(end)}`;
    };

    const formatDateShort = (value) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const formatDateDisplay = (value) => {
        if (!value) return "—";
        const d = new Date(value);
        return d.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    };

    const formatDateTimeDisplay = (value) => {
        if (!value) return "—";
        const d = new Date(value);
        return d.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const DetailField = ({ label, value }) => (
        <div className="p-4 rounded-xl border bg-[hsl(var(--card))] shadow-sm flex flex-col gap-1 min-h-[72px]">
            <span className="text-xs font-semibold tracking-wide text-[hsl(var(--muted-foreground))] uppercase">
                {label}
            </span>
            <span className="text-[hsl(var(--foreground))] leading-tight">{value || "—"}</span>
        </div>
    );

    // Load data jadwal mingguan
    const load = async (targetPegawaiId = filterPegawaiId, mode = filterMode) => {
        try {
            let res;
            if (targetPegawaiId) {
                res = await api.get("/jadwal", {
                    params: { pegawai_id: targetPegawaiId },
                });
            } else {
                if (mode === "all") {
                    res = await api.get("/jadwal");
                } else {
                    res = await api.get("/jadwal/week");
                }
            }
            setRows(Array.isArray(res.data) ? res.data : res.data?.data || []);
        } catch {
            toast.error(
                targetPegawaiId
                    ? "Gagal memuat jadwal pegawai yang dipilih"
                    : "Gagal memuat jadwal kerja mingguan"
            );
        }
    };

    // Load daftar pegawai
    const loadEmployees = async () => {
        try {
            const res = await api.get("/pegawai");
            const list = Array.isArray(res.data?.data) ? res.data.data : [];
            const map = {};
            list.forEach((p) => {
                const roleName = (p.user?.role || p.role || "").toLowerCase();
                map[String(p.id)] = {
                    role: roleName,
                    jabatan: (p.jabatan || "").toLowerCase(),
                };
            });
            setEmployeeMap(map);

            const allowedList =
                role === "supervisor"
                    ? list.filter((p) => (p.user?.role || p.role || "").toLowerCase() !== "supervisor")
                    : list;
            setEmployees(
                allowedList.map((p) => ({
                    value: p.id,
                    label: `${p.nama} (${p.jabatan || "Tanpa jabatan"})`,
                    jabatan: p.jabatan,
                    role: (p.user?.role || p.role || "").toLowerCase(),
                }))
            );
        } catch (err) {
            console.error("Gagal memuat pegawai:", err);
            toast.error("Gagal memuat daftar pegawai");
        }
    };

    React.useEffect(() => {
        load(filterPegawaiId, filterMode);
    }, [filterPegawaiId, filterMode]);

    React.useEffect(() => {
        loadEmployees();
    }, []);

    React.useEffect(() => {
        setPageIndex(0);
    }, [filterMode, filterDate, q, filterPegawaiId]);

    React.useEffect(() => {
        if (pegawaiId && !employees.some((emp) => String(emp.value) === String(pegawaiId))) {
            setPegawaiId("");
        }
    }, [employees, pegawaiId]);

    React.useEffect(() => {
        if (!modalAdd) {
            setScheduleErrors({});
        }
    }, [modalAdd]);

    const isSupervisorTarget = React.useCallback(
        (targetId) => {
            if (role !== "supervisor") return false;
            const info = employeeMap[String(targetId)];
            if (!info) return false;
            return info.role === "supervisor" || info.jabatan === "supervisor";
        },
        [role, employeeMap]
    );

    // ➕ Tambah jadwal
    const createSchedule = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = Object.fromEntries(fd.entries());

        const payloadBase = {
            pegawai_id: data.pegawai_id || pegawaiId,
            tanggal: data.tanggal,
            shift: data.shift,
            jam_mulai: data.jam_mulai,
            jam_selesai: data.jam_selesai,
        };

        if (isSupervisorTarget(payloadBase.pegawai_id)) {
            toast.error("Supervisor tidak dapat membuat jadwal untuk sesama supervisor.");
            return;
        }

        const validation = validateSchedulePayload(payloadBase);
        if (Object.keys(validation).length > 0) {
            setScheduleErrors(validation);
            const msg = firstErrorMessage(validation) || "Semua informasi jadwal wajib diisi.";
            toast.error(msg);
            return;
        }
        setScheduleErrors({});

        const rangeDays = Number.parseInt(data.rentang_waktu || "1", 10);
        const totalDays = Number.isFinite(rangeDays) && rangeDays > 0 ? rangeDays : 1;
        const baseDate = new Date(payloadBase.tanggal);
        if (Number.isNaN(baseDate.getTime())) {
            toast.error("Tanggal tidak valid.");
            setScheduleErrors({ tanggal: "Tanggal tidak valid." });
            return;
        }

        try {
            for (let i = 0; i < totalDays; i += 1) {
                const nextDate = new Date(baseDate);
                nextDate.setDate(baseDate.getDate() + i);
                await api.post("/jadwal", {
                    ...payloadBase,
                    tanggal: formatDate(nextDate),
                });
            }
            toast.success(
                totalDays > 1
                    ? `Jadwal berhasil dibuat untuk ${totalDays} hari berturut-turut.`
                    : "Jadwal berhasil dibuat"
            );
            setScheduleErrors({});
            setModalAdd(false);
            setPegawaiId("");
            await load(filterPegawaiId || payloadBase.pegawai_id, filterMode);
            if (!filterPegawaiId && payloadBase.pegawai_id) {
                setFilterPegawaiId(payloadBase.pegawai_id);
            }
            setFilterDate(payloadBase.tanggal);
        } catch (err) {
            console.error(err);
            const backend = normalizeBackendErrors(err?.response?.data?.errors);
            if (Object.keys(backend).length) {
                setScheduleErrors(backend);
                const msg = firstErrorMessage(backend) || err?.response?.data?.message;
                toast.error(msg || "Gagal membuat jadwal");
            } else {
                const msg = err?.response?.data?.message || "Gagal membuat jadwal";
                toast.error(msg);
            }
        }
    };

    // ✏️ Edit jadwal
    const updateSchedule = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = Object.fromEntries(fd.entries());

        if (!selectedEdit) return;

        const normalize = (val = "") => (val || "").toString().trim();
        const normalizeId = (val) => String(val ?? "");
        const normalizeTime = (val = "") => normalize(val).slice(0, 5);
        setEditErrors({});
        const payload = {
            pegawai_id: data.pegawai_id || selectedEdit.pegawai_id,
            tanggal: data.tanggal,
            shift: data.shift,
            jam_mulai: data.jam_mulai,
            jam_selesai: data.jam_selesai,
        };

        if (isSupervisorTarget(payload.pegawai_id)) {
            toast.error("Supervisor tidak dapat mengubah jadwal sesama supervisor.");
            return;
        }

        const incoming = {
            pegawai_id: normalizeId(payload.pegawai_id),
            tanggal: payload.tanggal,
            shift: payload.shift,
            jam_mulai: normalizeTime(payload.jam_mulai),
            jam_selesai: normalizeTime(payload.jam_selesai),
        };
        const existing = {
            pegawai_id: normalizeId(selectedEdit.pegawai_id),
            tanggal: selectedEdit.tanggal,
            shift: selectedEdit.shift,
            jam_mulai: normalizeTime(selectedEdit.jam_mulai),
            jam_selesai: normalizeTime(selectedEdit.jam_selesai),
        };
        const noChanges = Object.keys(incoming).every((key) => incoming[key] === existing[key]);
        if (noChanges) {
            toast.info("Tidak ada perubahan pada jadwal.");
            closeEditModal();
            return;
        }
        const validation = validateSchedulePayload(payload);
        if (Object.keys(validation).length > 0) {
            setEditErrors(validation);
            toast.error(firstErrorMessage(validation) || "Periksa kembali data jadwal.");
            return;
        }

        try {
            await api.put(`/jadwal/${selectedEdit.id}`, payload);
            toast.success("Jadwal berhasil diperbarui");
            closeEditModal();
            await load();
        } catch (err) {
            const backend = normalizeBackendErrors(err?.response?.data?.errors);
            if (Object.keys(backend).length) {
                setEditErrors(backend);
                toast.error(firstErrorMessage(backend) || "Gagal memperbarui jadwal");
            } else {
                toast.error(err?.response?.data?.message || "Gagal memperbarui jadwal");
            }
        }
    };

    // 🗑️ Hapus jadwal
    const deleteSchedule = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/jadwal/${deleteTarget.id}`);
            toast.success("Jadwal berhasil dihapus");
            await load(filterPegawaiId, filterMode);
        } catch {
            toast.error("Gagal menghapus jadwal");
        } finally {
            setDeleteTarget(null);
            setDeleteModalOpen(false);
        }
    };

    // 📄 Detail jadwal (klik baris)
    const showDetail = async (jadwal) => {
        try {
            const res = await api.get(`/jadwal/${jadwal.id}`);
            setSelectedDetail(res.data?.data || jadwal);
            setModalDetail(true);
        } catch (err) {
            console.error("Gagal memuat detail jadwal:", err);
            toast.error("Gagal memuat detail jadwal");
        }
    };

    const filterModeOptions = [
        { value: "all", label: "Lihat Semua Jadwal" },
        { value: "day", label: "Per Hari" },
        { value: "week", label: "Per Minggu" },
        { value: "month", label: "Per Bulan" },
    ];
    const filterModeLabels = {
        day: "harian",
        week: "mingguan",
        month: "bulanan",
        all: "semua jadwal",
    };

    const handleModeChange = (nextMode) => {
        setFilterMode(nextMode);
        setPageIndex(0);
        if (nextMode === "all") {
            return;
        }
        setFilterDate((prev) => {
            const safeDate = prev || formatDate(new Date());
            if (nextMode === "month") {
                return `${safeDate.slice(0, 7)}-01`;
            }
            if (nextMode === "week") {
                return formatDate(startOfWeek(toDate(safeDate)));
            }
            return safeDate;
        });
    };

    const handleDateChange = (value) => {
        if (filterMode === "all") return;
        if (filterMode === "month") {
            setFilterDate(value ? `${value}-01` : "");
        } else {
            setFilterDate(value);
        }
        setPageIndex(0);
    };

    const isAllMode = filterMode === "all";
    const filterInputType = filterMode === "month" ? "month" : "date";
    const filterInputValue =
        filterMode === "month"
            ? filterDate?.slice(0, 7) || ""
            : filterDate || "";

    const filteredRows = React.useMemo(() => {
        const keyword = q.trim().toLowerCase();
        const safeDate = filterDate || formatDate(new Date());
        const baseDate = toDate(safeDate);
        const weekStart = startOfWeek(baseDate);
        const weekEnd = endOfWeek(baseDate);

        return (Array.isArray(rows) ? rows : [])
            .filter((row) => {
                const rowDate = toDate(row.tanggal);
                if (Number.isNaN(rowDate.getTime())) return false;
                if (filterMode === "all") {
                    return true;
                }
                if (filterMode === "day") {
                    return row.tanggal === safeDate;
                }
                if (filterMode === "week") {
                    return rowDate >= weekStart && rowDate <= weekEnd;
                }
                if (filterMode === "month") {
                    return (
                        rowDate.getFullYear() === baseDate.getFullYear() &&
                        rowDate.getMonth() === baseDate.getMonth()
                    );
                }
                return true;
            })
            .filter((row) => {
                if (!keyword) return true;
                return [row.nama, row.shift, row.tanggal].some((value) =>
                    (value || "").toLowerCase().includes(keyword)
                );
            })
            .sort((a, b) => {
                const dateDiff =
                    new Date(a.tanggal) - new Date(b.tanggal);
                if (dateDiff !== 0) return dateDiff;
                return (a.jam_mulai || "").localeCompare(b.jam_mulai || "");
            });
    }, [rows, filterMode, filterDate, q]);

    const weekGroups = React.useMemo(() => {
        const grouped = new Map();
        filteredRows.forEach((row) => {
            const rowDate = toDate(row.tanggal);
            const start = startOfWeek(rowDate);
            const end = endOfWeek(rowDate);
            const key = formatDate(start);
            if (!grouped.has(key)) {
                grouped.set(key, {
                    start,
                    end,
                    label: formatWeekRange(start, end),
                    rows: [],
                });
            }
            grouped.get(key).rows.push(row);
        });

        return Array.from(grouped.values())
            .map((group) => ({
                ...group,
                rows: group.rows.sort((a, b) => {
                    const dateDiff =
                        new Date(a.tanggal) - new Date(b.tanggal);
                    if (dateDiff !== 0) return dateDiff;
                    return (a.jam_mulai || "").localeCompare(b.jam_mulai || "");
                }),
            }))
            .sort((a, b) => b.start - a.start);
    }, [filteredRows]);

    React.useEffect(() => {
        setPageIndex((prev) =>
            weekGroups.length === 0 ? 0 : Math.min(prev, weekGroups.length - 1)
        );
    }, [weekGroups.length]);

    const currentWeek = weekGroups[pageIndex] || null;
    const totalPages = weekGroups.length;

    return (
        <div>
            <ConfirmDeleteModal
                open={deleteModalOpen}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setDeleteTarget(null);
                }}
                onConfirm={deleteSchedule}
                entityLabel="jadwal kerja"
                targetName={deleteTarget?.nama}
            />
            <Card>
                <CardHeader className="space-y-6">
                    <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                            {role === "owner" ? "Panel Owner" : "Panel Supervisor"}
                        </p>
                        <CardTitle className="text-2xl font-semibold text-[hsl(var(--primary))]">
                            Jadwal Kerja Pegawai
                        </CardTitle>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            Pilih pegawai, tentukan rentang waktu, dan kelola shift dengan lebih rapi.
                        </p>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                                Cari nama atau tanggal
                            </span>
                            <SearchInput
                                placeholder="Cari nama atau tanggal..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                className="w-full"
                                aria-label="Cari jadwal"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                                Pegawai
                            </span>
                            <select
                                className="ds-input"
                                value={filterPegawaiId}
                                onChange={(e) => setFilterPegawaiId(e.target.value)}
                            >
                                <option value="">Semua Pegawai</option>
                                {employees.map((emp) => (
                                    <option key={emp.value} value={emp.value}>
                                        {emp.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                                Rentang Jadwal
                            </span>
                            <select
                                className="ds-input"
                                value={filterMode}
                                onChange={(e) => handleModeChange(e.target.value)}
                            >
                                {filterModeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                                Tanggal acuan
                            </span>
                            <Input
                                type={filterInputType}
                                value={filterInputValue}
                                onChange={(e) => handleDateChange(e.target.value)}
                                disabled={isAllMode}
                                aria-label="Tanggal acuan filter"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-sm text-[hsl(var(--muted-foreground))]">
                            <span className="font-medium text-[hsl(var(--foreground))]">
                                {filterPegawaiId
                                    ? employees.find((emp) => String(emp.value) === String(filterPegawaiId))?.label
                                    : "Menampilkan semua pegawai"}
                            </span>
                            <span> — Filter {filterModeLabels[filterMode] || "mingguan"}</span>
                        </div>
                        <Button variant="accent" onClick={() => setModalAdd(true)} className="w-full sm:w-auto">
                            <i className="fa-solid fa-plus mr-2" /> Buat Jadwal Baru
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-[hsl(var(--muted))]/40 rounded-xl p-4 border border-[hsl(var(--border))]">
                        <div>
                            {currentWeek ? (
                                <>
                                    <p className="text-sm font-semibold text-[hsl(var(--primary))]">
                                        Minggu {currentWeek.label}
                                    </p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                        {currentWeek.rows.length} jadwal pada minggu ini
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                    Tidak ada jadwal untuk filter yang dipilih.
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {totalPages > 0 && (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                    Minggu {pageIndex + 1} dari {totalPages}
                                </span>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
                                disabled={pageIndex === 0}
                                className="shadow-sm"
                            >
                                <i className="fa-solid fa-chevron-left mr-1" /> Sebelumnya
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setPageIndex((prev) =>
                                        Math.min(prev + 1, Math.max(totalPages - 1, 0))
                                    )
                                }
                                disabled={pageIndex >= totalPages - 1 || totalPages === 0}
                                className="shadow-sm"
                            >
                                Berikutnya <i className="fa-solid fa-chevron-right ml-1" />
                            </Button>
                        </div>
                    </div>
                    <Table>
                        <THead>
                            <TR>
                                <TH>Nama Pegawai</TH>
                                <TH>Shift</TH>
                                <TH>Tanggal</TH>
                                <TH>Jam</TH>
                                <TH className="text-center">Aksi</TH>
                            </TR>
                        </THead>
                        <TBody>
                            {currentWeek &&
                                currentWeek.rows.map((r) => (
                                    <TR
                                        key={r.id}
                                        onClick={() => showDetail(r)}
                                        className="hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer transition-all"
                                    >
                                        <TD>{r.nama}</TD>
                                        <TD>{r.shift}</TD>
                                        <TD>{formatDateShort(r.tanggal)}</TD>
                                        <TD>
                                            {r.jam_mulai} - {r.jam_selesai}
                                        </TD>
                                        <TD className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEdit(r);
                                                        setModalEdit(true);
                                                    }}
                                                    title="Edit Jadwal"
                                                    className="btn-edit"
                                                >
                                                    <i className="fa-solid fa-pen" />
                                                    <span>Edit</span>
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteTarget(r);
                                                        setDeleteModalOpen(true);
                                                    }}
                                                    title="Hapus Jadwal"
                                                    className="btn-delete"
                                                >
                                                    <i className="fa-solid fa-trash" />
                                                    <span>Hapus</span>
                                                </button>
                                            </div>
                                        </TD>
                                    </TR>
                                ))}
                            {(!currentWeek || currentWeek.rows.length === 0) && (
                                <TR>
                                    <TD colSpan={5} className="text-center py-6 text-gray-400">
                                        Tidak ada jadwal pada rentang ini.
                                    </TD>
                                </TR>
                            )}
                        </TBody>
                    </Table>
                </CardContent>
            </Card>

            {/* 📄 Modal Detail Jadwal */}
            <Modal
                open={modalDetail}
                title="Detail Jadwal Kerja"
                onClose={() => setModalDetail(false)}
            >
                {selectedDetail && (
                    <div className="space-y-4 px-1 text-[15px]">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="p-4 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                                <p className="text-xs font-semibold tracking-wide text-[hsl(var(--muted-foreground))]">Nama Pegawai</p>
                                <p className="text-lg font-semibold">{selectedDetail.nama}</p>
                                <p className="text-[hsl(var(--muted-foreground))]">{selectedDetail.jabatan || "—"}</p>
                            </div>
                            <div className="p-4 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                                <p className="text-xs font-semibold tracking-wide text-[hsl(var(--muted-foreground))]">Shift</p>
                                <p className="text-lg font-semibold">{selectedDetail.shift}</p>
                                <p className="text-[hsl(var(--muted-foreground))]">Status: {selectedDetail.status || "Aktif"}</p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailField label="Tanggal" value={formatDateDisplay(selectedDetail.tanggal)} />
                            <DetailField label="Jam Kerja" value={`${selectedDetail.jam_mulai} - ${selectedDetail.jam_selesai}`} />
                            {selectedDetail.telepon && (
                                <DetailField label="Telepon" value={selectedDetail.telepon} />
                            )}
                            {selectedDetail.created_at && (
                                <DetailField label="Dibuat" value={formatDateTimeDisplay(selectedDetail.created_at)} />
                            )}
                            {selectedDetail.updated_at && (
                                <DetailField label="Diperbarui" value={formatDateTimeDisplay(selectedDetail.updated_at)} />
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                className="btn-neutral"
                                onClick={() => setModalDetail(false)}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Tambah Jadwal */}
            <Modal
                open={modalAdd}
                title="Buat Jadwal Baru"
                onClose={() => setModalAdd(false)}
            >
                <form onSubmit={createSchedule} className="space-y-4">
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
                            {employees.map((emp) => (
                                <option key={emp.value} value={emp.value}>
                                    {emp.label}
                                </option>
                            ))}
                        </select>
                        <FieldError message={scheduleErrors.pegawai_id} />
                    </div>

                    <div>
                        <Label>Shift</Label>
                            <select
                                name="shift"
                                className="ds-input w-full"
                                onChange={(e) => {
                                    const shift = e.target.value;
                                    if (shift && shiftTimes[shift]) {
                                        const { jam_mulai, jam_selesai } = shiftTimes[shift];
                                        document.querySelector('input[name="jam_mulai"]').value =
                                            jam_mulai;
                                        document.querySelector('input[name="jam_selesai"]').value =
                                            jam_selesai;
                                    }
                                    e.target.blur();
                                }}
                                required
                        >
                            <option value="">Pilih shift</option>
                            <option value="Pagi">Pagi</option>
                            <option value="Siang">Siang</option>
                            <option value="Malam">Malam</option>
                        </select>
                        <small className="text-xs text-gray-500">
                            Otomatis isi jam kerja sesuai shift (bisa disesuaikan).
                        </small>
                        <FieldError message={scheduleErrors.shift} />
                    </div>

                    <div>
                        <Label>Tanggal</Label>
                        <Input type="date" name="tanggal" required />
                        <FieldError message={scheduleErrors.tanggal} />
                    </div>

                    <div>
                        <Label>Rentang Waktu</Label>
                        <select name="rentang_waktu" className="ds-input w-full" defaultValue="1">
                            {rangeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <small className="text-xs text-gray-500">
                            Jadwal akan otomatis digandakan tiap hari selama rentang yang dipilih.
                        </small>
                    </div>

                    <div>
                        <Label>Jam Mulai</Label>
                        <Input type="time" name="jam_mulai" required />
                        <FieldError message={scheduleErrors.jam_mulai} />
                    </div>

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

            {/* Modal Edit Jadwal */}
            <Modal
                open={modalEdit}
                title="Edit Jadwal"
                onClose={closeEditModal}
            >
                {selectedEdit && (
                    <form onSubmit={updateSchedule} className="space-y-4">
                        <div>
                            <Label>Pegawai</Label>
                            <div className="ds-input bg-[hsl(var(--muted))]">
                                {selectedEdit.nama}
                            </div>
                            <input type="hidden" name="pegawai_id" value={selectedEdit.pegawai_id} />
                        </div>

                        <div>
                            <Label>Shift</Label>
                            <select
                                name="shift"
                                defaultValue={selectedEdit.shift}
                                className="ds-input w-full"
                                onChange={(e) => {
                                    const shift = e.target.value;
                                    if (shift && shiftTimes[shift]) {
                                        const { jam_mulai, jam_selesai } = shiftTimes[shift];
                                        document.querySelector('input[name="jam_mulai"]').value =
                                            jam_mulai;
                                        document.querySelector('input[name="jam_selesai"]').value =
                                            jam_selesai;
                                    }
                                    e.target.blur();
                                }}
                                required
                            >
                                <option value="Pagi">Pagi</option>
                                <option value="Siang">Siang</option>
                                <option value="Malam">Malam</option>
                        </select>
                        <small className="text-xs text-gray-500">
                            Otomatis isi jam kerja sesuai shift (bisa disesuaikan).
                        </small>
                        <FieldError message={editErrors.shift} />
                    </div>

                    <div>
                        <Label>Tanggal</Label>
                        <Input type="date" name="tanggal" defaultValue={selectedEdit.tanggal} required />
                        <FieldError message={editErrors.tanggal} />
                    </div>

                    <div>
                        <Label>Jam Mulai</Label>
                        <Input type="time" name="jam_mulai" defaultValue={selectedEdit.jam_mulai} required />
                        <FieldError message={editErrors.jam_mulai} />
                    </div>

                    <div>
                        <Label>Jam Selesai</Label>
                        <Input type="time" name="jam_selesai" defaultValue={selectedEdit.jam_selesai} required />
                        <FieldError message={editErrors.jam_selesai} />
                    </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="neutral" onClick={closeEditModal}>
                                Batal
                            </Button>
                            <Button type="submit">Simpan</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
