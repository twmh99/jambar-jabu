import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TBody, THead, TH, TR, TD } from '../../components/ui/table';
import { Input, Label, Select } from '../../components/ui/input';
import { toast } from '../../components/ui/toast';
import Modal from '../../components/common/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import SearchInput from '../../components/common/SearchInput';
import api from '../../services/api';

const ROLE_RATE_MAP = {
  Supervisor: 30000,
  Koki: 27000,
  Kasir: 25000,
  Pelayan: 23000,
  'Tukang Kebun': 20000,
};
const JABATAN_OPTIONS = ['Supervisor', 'Koki', 'Kasir', 'Pelayan', 'Tukang Kebun'];

export default function EmployeesBase({ role }) {
  const [rows, setRows] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedPegawai, setSelectedPegawai] = React.useState(null);
  const [filterRole, setFilterRole] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [selectedJabatan, setSelectedJabatan] = React.useState(JABATAN_OPTIONS[0]);
  const hourlyRateRef = React.useRef(null);
  const pageSize = 8;
  const [formError, setFormError] = React.useState('');
  const isSupervisorContext = role === 'supervisor';
  const editingPegawai = React.useMemo(() => {
    if (!editId) return null;
    return rows.find((r) => r.id === editId) || null;
  }, [editId, rows]);
  const editingJabatan = editingPegawai?.jabatan || null;
  const selectableJabatanOptions = React.useMemo(() => {
    let opts = [...JABATAN_OPTIONS];
    if (isSupervisorContext && !(editId && editingJabatan === 'Supervisor')) {
      opts = opts.filter((opt) => opt !== 'Supervisor');
    }
    if (editId && editingJabatan && !opts.includes(editingJabatan)) {
      opts = [editingJabatan, ...opts];
    }
    return opts;
  }, [isSupervisorContext, editId, editingJabatan]);
  const disableJabatanSelect = !!(editId && editingJabatan === 'Supervisor');
  const getPegawaiValue = (field) => (editId && editingPegawai ? editingPegawai[field] : undefined);
  const applyRoleRate = (jabatan) => {
    if (ROLE_RATE_MAP[jabatan] && hourlyRateRef.current) {
      hourlyRateRef.current.value = ROLE_RATE_MAP[jabatan];
    }
  };
  const deriveRoleValue = (jabatan) => (jabatan === 'Supervisor' ? 'supervisor' : 'employee');
  const deriveRoleLabel = (jabatan) => (jabatan === 'Supervisor' ? 'Supervisor' : 'Pegawai');

  React.useEffect(() => {
    if (!open) return;
    const jabatanDefault =
      editingJabatan || selectableJabatanOptions[0] || 'Koki';
    setSelectedJabatan(jabatanDefault);
    if (hourlyRateRef.current) {
      const presetRate =
        editingPegawai?.hourly_rate ??
        ROLE_RATE_MAP[jabatanDefault] ??
        ROLE_RATE_MAP.Supervisor;
      hourlyRateRef.current.value = presetRate;
    }
  }, [open, editingJabatan, selectableJabatanOptions, editingPegawai]);

  // ===== LOAD DATA =====
  const loadEmployees = async () => {
    try {
      const res = await api.get('/pegawai');
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      setRows(data);
    } catch (err) {
      console.error('Load error:', err.response?.data || err.message);
      toast.error('Gagal memuat data pegawai.');
    }
  };

  React.useEffect(() => {
    loadEmployees();
  }, []);

  // ===== SHOW DETAIL =====
  const showDetail = async (pegawai) => {
    try {
      const res = await api.get(`/pegawai/profil/${pegawai.id}`);
      setSelectedPegawai(res.data?.data || pegawai);
      setDetailOpen(true);
    } catch (err) {
      toast.error('Gagal memuat detail pegawai.');
      setSelectedPegawai(pegawai);
      setDetailOpen(true);
    }
  };

  // ===== SAVE / UPDATE =====
  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    if (!data.nama || !data.jabatan || !data.telepon) {
      const msg = 'Lengkapi nama, jabatan, dan telepon.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    try {
      setLoading(true);
      let res;

      if (editId) {
        res = await api.put(`/pegawai/${editId}`, data);
        toast.success('Data pegawai berhasil diperbarui.');
        setFormError('');

        // ✅ Setelah update, langsung ambil ulang data terbaru
        await loadEmployees();

        // ✅ Tutup modal & reset form
        setOpen(false);
        setEditId(null);
        e.target.reset();
        return;
      }
      else {
        res = await api.post('/pegawai', data);
        const newPegawai =
          res.data?.data?.pegawai || res.data?.pegawai || res.data || null;
        if (newPegawai && newPegawai.id) {
          setRows((prev) => [newPegawai, ...prev]);
        } else {
          await loadEmployees();
        }
        toast.success(`Pegawai "${data.nama}" berhasil ditambahkan.`);
        setFormError('');
      }

      setOpen(false);
      setEditId(null);
      e.target.reset();
    } catch (err) {
      console.error('Save error:', err.response?.data || err.message);
      const msg = err.response?.data?.message || 'Gagal menyimpan pegawai!';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ===== DELETE =====
  const confirmRemove = (idx) => {
    setDeleteTarget(idx);
    setShowDelete(true);
  };

  const handleDeleteConfirm = async () => {
    const idx = deleteTarget;
    if (idx == null) return;
    try {
      await api.delete(`/pegawai/${rows[idx].id}`);
      toast.info(`Pegawai "${rows[idx].nama}" berhasil dihapus.`);
      setShowDelete(false);
      setRows((prev) => prev.filter((_, i) => i !== idx));
    } catch (err) {
      toast.error('Gagal menghapus data pegawai.');
    }
  };

  // ===== FILTERING =====
  const uniqueRoles = React.useMemo(() => {
    const roles = new Set();
    rows.forEach((r) => {
      if (r.jabatan) roles.add(r.jabatan);
    });
    return Array.from(roles).sort();
  }, [rows]);

  const filtered = Array.isArray(rows)
    ? rows.filter((r) => {
      const s = q.toLowerCase();
      const matchesSearch = [r.nama, r.jabatan, r.telepon, r.status].some((v) =>
        (v || '').toLowerCase().includes(s)
      );
      const matchesRole = filterRole ? (r.jabatan || '').toLowerCase() === filterRole.toLowerCase() : true;
      const matchesStatus = filterStatus ? (r.status || '').toLowerCase() === filterStatus.toLowerCase() : true;
      return matchesSearch && matchesRole && matchesStatus;
    })
    : [];

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <ConfirmDeleteModal
        open={showDelete}
        onCancel={() => setShowDelete(false)}
        onConfirm={handleDeleteConfirm}
        entityLabel="data pegawai"
        targetName={rows[deleteTarget]?.nama}
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>
              {role === 'supervisor'
                ? 'Data Pegawai (Supervisor)'
                : 'Data Pegawai (Owner)'}
            </CardTitle>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Total Pegawai: <span className="font-semibold text-[hsl(var(--primary))]">{rows.length}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <div className="flex gap-2">
              <SearchInput
                placeholder="Cari nama/jabatan/telepon..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="min-w-[220px] sm:w-72"
                aria-label="Cari pegawai"
              />
              <Button
                variant="accent"
                onClick={() => {
                  setEditId(null);
                  setOpen(true);
                }}
              >
                <i className="fa-solid fa-user-plus mr-2" />
                Tambah
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua Jabatan</option>
                {uniqueRoles.map((jabatan) => (
                  <option key={jabatan} value={jabatan}>
                    {jabatan}
                  </option>
                ))}
              </Select>
              <Select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH>Jabatan</TH>
                <TH>Telepon</TH>
                <TH>Status</TH>
                <TH className="text-center">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {paged.map((r, idx) => (
                <TR
                  key={r.id}
                  onClick={() => showDetail(r)}
                  className="hover:bg-[hsl(var(--muted)/0.2)] transition cursor-pointer"
                >
                  <TD>{r.nama}</TD>
                  <TD>{r.jabatan}</TD>
                  <TD>{r.telepon}</TD>
                  <TD>
                    <span
                      className={
                        r.status === 'Aktif'
                          ? 'ds-badge bg-[hsl(var(--success))] text-[hsl(var(--primary-foreground))]'
                          : 'ds-badge bg-[hsl(var(--muted))]'
                      }
                    >
                      {r.status}
                    </span>
                  </TD>
                  <TD className="text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditId(r.id);
                          setOpen(true);
                        }}
                        className="btn-edit"
                        title="Edit Pegawai"
                      >
                        <i className="fa-solid fa-pen" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmRemove((page - 1) * pageSize + idx);
                        }}
                        className="btn-delete"
                        title="Hapus Pegawai"
                      >
                        <i className="fa-solid fa-trash" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </TD>
                </TR>
              ))}
              {paged.length === 0 && (
                <TR>
                  <TD
                    colSpan={5}
                    className="py-6 text-center text-[hsl(var(--muted-foreground))]"
                  >
                    Tidak ada data
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {/* FORM MODAL */}
      <Modal
        open={open}
        title={editId ? 'Ubah Pegawai' : 'Tambah Pegawai'}
        onClose={() => {
          setOpen(false);
          setFormError('');
        }}
      >
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <i className="fa-solid fa-circle-exclamation mr-2" />
                {formError}
              </div>
            )}
            <Label>Nama</Label>
            <Input
              name="nama"
              defaultValue={editId ? rows.find((r) => r.id === editId)?.nama : ''}
              required
            />
          </div>
          <div>
            <Label>Jabatan</Label>
            <Select
              name="jabatan"
              value={selectedJabatan}
              onChange={(e) => {
                setSelectedJabatan(e.target.value);
                applyRoleRate(e.target.value);
              }}
              disabled={disableJabatanSelect}
              required
            >
              {selectableJabatanOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Telepon</Label>
            <Input
              name="telepon"
              defaultValue={editId ? rows.find((r) => r.id === editId)?.telepon : ''}
              required
            />
          </div>
          <div>
            <Label>Email (Login)</Label>
            <Input
              type="email"
              name="email"
              placeholder="contoh: pegawai@gmail.com"
              defaultValue={editId ? rows.find((r) => r.id === editId)?.email || '' : ''}
            />
          </div>
          <div>
            <Label>Role</Label>
            <Input
              value={deriveRoleLabel(selectedJabatan)}
              readOnly
              className="bg-[hsl(var(--muted))]"
            />
            <input type="hidden" name="role" value={deriveRoleValue(selectedJabatan)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              name="status"
              defaultValue={editId ? rows.find((r) => r.id === editId)?.status : 'Aktif'}
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
              defaultValue={ROLE_RATE_MAP.Supervisor}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="neutral"
              onClick={() => {
                setOpen(false);
                setFormError('');
              }}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        open={detailOpen}
        title="Detail Pegawai"
        onClose={() => setDetailOpen(false)}
      >
        {selectedPegawai ? (
          <div className="max-h-[70vh] overflow-y-auto space-y-6 text-[15px]">
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#0ea5e9] flex items-center justify-center text-white text-3xl font-semibold shadow-lg">
                {selectedPegawai.nama?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{selectedPegawai.nama}</h2>
                <p className="text-[hsl(var(--muted-foreground))]">
                  {selectedPegawai.jabatan || '—'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDetailOpen(false);
                  setEditId(selectedPegawai.id);
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
                { label: 'Telepon', value: selectedPegawai.telepon || '-' },
                { label: 'Email', value: selectedPegawai.email || '-' },
                {
                  label: 'Role',
                  value: (() => {
                    const rawRole = (selectedPegawai.role || '').toString().toLowerCase();
                    if (rawRole === 'employee') return 'Pegawai';
                    return rawRole ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1) : '-';
                  })(),
                },
                {
                  label: 'Status',
                  value: (
                    <span
                      className={`ds-badge ${
                        selectedPegawai.status === 'Aktif'
                          ? 'bg-[hsl(var(--success))] text-white'
                          : 'bg-[hsl(var(--muted))]'
                      }`}
                    >
                      {selectedPegawai.status || '-'}
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
                  Rp{' '}
                  {selectedPegawai.hourly_rate
                    ? selectedPegawai.hourly_rate.toLocaleString('id-ID')
                    : '0'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="btn-neutral"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            Memuat detail pegawai...
          </p>
        )}
      </Modal>

    </div>
  );
}
