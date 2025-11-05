import React from "react";
import Select from "react-select";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input, Label } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import Modal from "../../components/common/Modal";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";

/**
 * 📅 Komponen Jadwal Kerja (Base)
 * Bisa dipakai Owner dan Supervisor (dengan prop role)
 */
export default function JadwalKerjaBase({ role = "supervisor" }) {
    const [rows, setRows] = React.useState([]);
    const [employees, setEmployees] = React.useState([]);
    const [selectedEmployee, setSelectedEmployee] = React.useState(null);
    const [selectedEdit, setSelectedEdit] = React.useState(null);
    const [modalAdd, setModalAdd] = React.useState(false);
    const [modalEdit, setModalEdit] = React.useState(false);
    const [q, setQ] = React.useState("");

    // 🌟 Tambahan untuk detail modal
    const [selectedDetail, setSelectedDetail] = React.useState(null);
    const [modalDetail, setModalDetail] = React.useState(false);

    // Shift otomatis
    const shiftTimes = {
        Pagi: { jam_mulai: "09:00", jam_selesai: "14:00" },
        Siang: { jam_mulai: "14:00", jam_selesai: "19:00" },
        Malam: { jam_mulai: "19:00", jam_selesai: "00:00" },
    };

    // Load data jadwal mingguan
    const load = async () => {
        try {
            const res = await api.get("/jadwal/week");
            setRows(Array.isArray(res.data) ? res.data : res.data?.data || []);
        } catch {
            toast.error("Gagal memuat jadwal kerja mingguan");
        }
    };

    // Load daftar pegawai
    const loadEmployees = async () => {
        try {
            const res = await api.get("/pegawai");
            const list = Array.isArray(res.data?.data) ? res.data.data : [];
            const mapped = list.map((p) => ({
                value: p.id,
                label: `${p.nama} (${p.jabatan || "Tanpa jabatan"})`,
            }));
            setEmployees(mapped);
        } catch (err) {
            console.error("Gagal memuat pegawai:", err);
            toast.error("Gagal memuat daftar pegawai");
        }
    };

    React.useEffect(() => {
        load();
        loadEmployees();
    }, []);

    // ➕ Tambah jadwal
    const createSchedule = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = Object.fromEntries(fd.entries());

        const payload = {
            pegawai_id: selectedEmployee?.value,
            tanggal: data.tanggal,
            shift: data.shift,
            jam_mulai: data.jam_mulai,
            jam_selesai: data.jam_selesai,
        };

        if (!payload.pegawai_id || !payload.tanggal || !payload.shift) {
            toast.error("Lengkapi semua data jadwal!");
            return;
        }

        try {
            await api.post("/jadwal", payload);
            toast.success("Jadwal berhasil dibuat");
            setModalAdd(false);
            setSelectedEmployee(null);
            await load();
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Gagal membuat jadwal");
        }
    };

    // ✏️ Edit jadwal
    const updateSchedule = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = Object.fromEntries(fd.entries());

        const payload = {
            pegawai_id: data.pegawai_id || selectedEdit.pegawai_id,
            tanggal: data.tanggal,
            shift: data.shift,
            jam_mulai: data.jam_mulai,
            jam_selesai: data.jam_selesai,
        };

        try {
            await api.put(`/jadwal/${selectedEdit.id}`, payload);
            toast.success("Jadwal berhasil diperbarui");
            setModalEdit(false);
            setSelectedEdit(null);
            await load();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal memperbarui jadwal");
        }
    };

    // 🗑️ Hapus jadwal
    const deleteSchedule = async (id) => {
        if (!confirm("Yakin ingin menghapus jadwal ini?")) return;
        try {
            await api.delete(`/jadwal/${id}`);
            toast.success("Jadwal berhasil dihapus");
            await load();
        } catch {
            toast.error("Gagal menghapus jadwal");
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

    // 🔍 Filter pencarian
    const filtered = rows.filter((r) =>
        [r.nama, r.shift, r.tanggal].some((v) =>
            (v || "").toLowerCase().includes(q.toLowerCase())
        )
    );

    return (
        <div>
            <Card>
                <CardHeader className="flex justify-between items-center">
                    <CardTitle>
                        {role === "owner" ? "Jadwal Kerja Pegawai" : "Jadwal Kerja Mingguan"}
                    </CardTitle>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Cari nama atau tanggal..."
                            className="w-64"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <Button variant="accent" onClick={() => setModalAdd(true)}>
                            <i className="fa-solid fa-plus mr-2" /> Buat Jadwal Baru
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <Table>
                        <THead>
                            <TR>
                                <TH>Nama Pegawai</TH>
                                <TH>Shift</TH>
                                <TH>Tanggal</TH>
                                <TH>Jam</TH>
                                <TH>Aksi</TH>
                            </TR>
                        </THead>
                        <TBody>
                            {filtered.map((r, i) => (
                                <TR
                                    key={i}
                                    onClick={() => showDetail(r)}
                                    className="hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer transition-all"
                                >
                                    <TD>{r.nama}</TD>
                                    <TD>{r.shift}</TD>
                                    <TD>{r.tanggal}</TD>
                                    <TD>{r.jam_mulai} - {r.jam_selesai}</TD>
                                    <TD className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedEdit(r);
                                                    setModalEdit(true);
                                                }}
                                                title="Edit Jadwal"
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-[#1e293b]/80 dark:hover:text-yellow-400 transition-all duration-200"
                                            >
                                                <i className="fa-solid fa-pen text-yellow-500" />
                                                <span>Edit</span>
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteSchedule(r.id);
                                                }}
                                                title="Hapus Jadwal"
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-[#0f172a]/80 dark:hover:text-red-400 transition-all duration-200"
                                            >
                                                <i className="fa-solid fa-trash text-red-500" />
                                                <span>Hapus</span>
                                            </button>
                                        </div>
                                    </TD>
                                </TR>
                            ))}
                            {filtered.length === 0 && (
                                <TR>
                                    <TD colSpan={5} className="text-center py-6 text-gray-400">
                                        Tidak ada jadwal minggu ini
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
                    <div className="space-y-3 max-h-[70vh] overflow-y-auto px-1">
                        <div className="grid grid-cols-2 gap-3 text-[15px]">
                            <p><b>Nama Pegawai:</b><br />{selectedDetail.nama}</p>
                            <p><b>Jabatan:</b><br />{selectedDetail.jabatan || "—"}</p>
                            <p><b>Tanggal:</b><br />{selectedDetail.tanggal}</p>
                            <p><b>Shift:</b><br />{selectedDetail.shift}</p>
                            <p><b>Jam Kerja:</b><br />{selectedDetail.jam_mulai} - {selectedDetail.jam_selesai}</p>
                            <p><b>Status:</b><br />{selectedDetail.status || "Aktif"}</p>
                            {selectedDetail.telepon && (
                                <p><b>Telepon:</b><br />{selectedDetail.telepon}</p>
                            )}
                            {selectedDetail.created_at && (
                                <p><b>Dibuat:</b><br />{selectedDetail.created_at}</p>
                            )}
                            {selectedDetail.updated_at && (
                                <p><b>Diperbarui:</b><br />{selectedDetail.updated_at}</p>
                            )}
                        </div>
                        <div className="pt-4 text-right">
                            <Button onClick={() => setModalDetail(false)}>Tutup</Button>
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
                        <Select
                            options={employees}
                            value={selectedEmployee}
                            onChange={setSelectedEmployee}
                            placeholder="Cari nama pegawai..."
                            isSearchable
                            required
                        />
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

            {/* Modal Edit Jadwal */}
            <Modal
                open={modalEdit}
                title="Edit Jadwal"
                onClose={() => setModalEdit(false)}
            >
                {selectedEdit && (
                    <form onSubmit={updateSchedule} className="space-y-4">
                        <div>
                            <Label>Pegawai</Label>
                            <Select
                                options={employees}
                                defaultValue={{
                                    value: selectedEdit.pegawai_id,
                                    label: selectedEdit.nama,
                                }}
                                name="pegawai_id"
                                placeholder="Pilih pegawai..."
                            />
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
                        </div>

                        <div>
                            <Label>Tanggal</Label>
                            <Input type="date" name="tanggal" defaultValue={selectedEdit.tanggal} required />
                        </div>

                        <div>
                            <Label>Jam Mulai</Label>
                            <Input type="time" name="jam_mulai" defaultValue={selectedEdit.jam_mulai} required />
                        </div>

                        <div>
                            <Label>Jam Selesai</Label>
                            <Input type="time" name="jam_selesai" defaultValue={selectedEdit.jam_selesai} required />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setModalEdit(false)}>
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
