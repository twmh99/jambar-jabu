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
import {
  validateEmployeeData,
  normalizeBackendErrors,
  firstErrorMessage,
} from '../../utils/validation';

const ROLE_RATE_MAP = {
  Supervisor: 30000,
  Koki: 27000,
  Kasir: 25000,
  Pelayan: 23000,
  'Tukang Kebun': 20000,
};
const JABATAN_OPTIONS = ['Supervisor', 'Koki', 'Kasir', 'Pelayan', 'Tukang Kebun'];

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
      <i className="fa-solid fa-circle-exclamation" />
      {message}
    </p>
  ) : null;

export default function EmployeesBase({ role }) {
  const [rows, setRows] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedPegawai, setSelectedPegawai] = React.useState(null);
  const [filterRole, setFilterRole] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [sortField, setSortField] = React.useState('nama');
  const [sortDir, setSortDir] = React.useState('asc');
  const [selectedJabatan, setSelectedJabatan] = React.useState(JABATAN_OPTIONS[0]);
  const hourlyRateRef = React.useRef(null);
  const [formError, setFormError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState({});
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
  
  // Owner boleh ubah Supervisor; Supervisor tidak boleh ubah Supervisor
  const disableJabatanSelect =
    isSupervisorContext && !!(editId && editingJabatan === 'Supervisor');
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

  React.useEffect(() => {
    if (!open) {
      setFormError('');
      setFieldErrors({});
    }
  }, [open]);

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
  const normalizeStr = (value = '') => value?.toString().trim();
  const normalizeEmail = (value = '') => normalizeStr(value).toLowerCase();

  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    const validation = validateEmployeeData(data);
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      const msg = firstErrorMessage(validation) || 'Semua field wajib diisi.';
      setFormError(msg);
      toast.error(msg);
      return;
    }
    setFieldErrors({});
    setFormError('');

    if (editId && editingPegawai) {
      const incoming = {
        nama: normalizeStr(data.nama),
        jabatan: data.jabatan,
        telepon: normalizeStr(data.telepon),
        email: normalizeEmail(data.email),
        status: data.status || 'Aktif',
        hourly_rate: Number(data.hourly_rate ?? editingPegawai.hourly_rate ?? 0),
        role: (data.role && data.role.length ? data.role : deriveRoleValue(data.jabatan)),
      };

      const existing = {
        nama: normalizeStr(editingPegawai.nama),
        jabatan: editingPegawai.jabatan,
        telepon: normalizeStr(editingPegawai.telepon),
        email: normalizeEmail(editingPegawai.email),
        status: editingPegawai.status || 'Aktif',
        hourly_rate: Number(editingPegawai.hourly_rate ?? 0),
        role: deriveRoleValue(editingPegawai.jabatan),
      };

      const isSame = Object.keys(incoming).every(
        (key) => incoming[key] === existing[key]
      );

      if (isSame) {
        toast.info('Tidak ada perubahan yang disimpan.');
        setOpen(false);
        setEditId(null);
        e.target.reset();
        return;
      }
    }

    try {
      setLoading(true);
      let res;

      if (editId) {
        res = await api.put(`/pegawai/${editId}`, data);
        toast.success('Data pegawai berhasil diperbarui.');
        setFormError('');
        setFieldErrors({});

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
        setFieldErrors({});
      }

      setOpen(false);
      setEditId(null);
      e.target.reset();
    } catch (err) {
      console.error('Save error:', err.response?.data || err.message);
      const backend = normalizeBackendErrors(err?.response?.data?.errors);
      if (Object.keys(backend).length) {
        setFieldErrors(backend);
        const msg = firstErrorMessage(backend);
        setFormError(msg);
        toast.error(msg || 'Gagal menyimpan pegawai!');
      } else {
        const msg = err.response?.data?.message || 'Gagal menyimpan pegawai!';
        setFormError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== DELETE =====
  const confirmRemove = (pegawai) => {
    if (!pegawai) return;
    setDeleteTarget({ id: pegawai.id, nama: pegawai.nama });
    setShowDelete(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return;
    const targetId = deleteTarget.id;
    const targetName = deleteTarget.nama || 'Pegawai';
    try {
      await api.delete(`/pegawai/${targetId}`);
      toast.info(`Pegawai "${targetName}" berhasil dihapus.`);
      setShowDelete(false);
      setDeleteTarget(null);
      setRows((prev) => prev.filter((row) => String(row.id) !== String(targetId)));
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
  const toggleSort = React.useCallback((field) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevField;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const filtered = React.useMemo(() => {
    const base = Array.isArray(rows) ? rows : [];
    const filteredRows = base.filter((r) => {
      const s = q.toLowerCase();
      const matchesSearch = [r.nama, r.jabatan, r.telepon, r.status].some((v) =>
        (v || '').toLowerCase().includes(s)
      );
      const matchesRole = filterRole ? (r.jabatan || '').toLowerCase() === filterRole.toLowerCase() : true;
      const matchesStatus = filterStatus ? (r.status || '').toLowerCase() === filterStatus.toLowerCase() : true;
      return matchesSearch && matchesRole && matchesStatus;
    });

    const sortedRows = [...filteredRows].sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      const compareText = (x = '', y = '') => dir * x.localeCompare(y, 'id');
      switch (sortField) {
        case 'jabatan':
          return compareText(a.jabatan || '', b.jabatan || '');
        case 'status':
          return compareText(a.status || '', b.status || '');
        case 'telepon':
          return compareText(a.telepon || '', b.telepon || '');
        case 'id':
          return dir * (Number(a.id) - Number(b.id));
        case 'nama':
        default:
          return compareText(a.nama || '', b.nama || '');
      }
    });

    return sortedRows;
  }, [rows, q, filterRole, filterStatus, sortField, sortDir]);

  return (
    <div className="space-y-6">
      <ConfirmDeleteModal
        open={showDelete}
        onCancel={() => {
          setShowDelete(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        entityLabel="data pegawai"
        targetName={deleteTarget?.nama}
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
                <TH className="cursor-pointer select-none" onClick={() => toggleSort("nama")}>
                  Nama
                </TH>
                <TH className="cursor-pointer select-none" onClick={() => toggleSort("jabatan")}>
                  Jabatan
                </TH>
                <TH className="cursor-pointer select-none" onClick={() => toggleSort("telepon")}>
                  Telepon
                </TH>
                <TH className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  Status
                </TH>
                <TH className="text-center">Aksi</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((r, idx) => (
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
                          confirmRemove(r);
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
              {filtered.length === 0 && (
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
          setFieldErrors({});
        }}
      >
        <form
          onSubmit={save}
          noValidate
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="sm:col-span-2">
            <Label>Nama</Label>
            <Input
              name="nama"
              defaultValue={editId ? rows.find((r) => r.id === editId)?.nama : ''}
              required
              requiredMessage="Nama wajib diisi."
            />
            <FieldError message={fieldErrors.nama} />
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
            <FieldError message={fieldErrors.jabatan} />
          </div>
          <div>
            <Label>Telepon</Label>
            <Input
              name="telepon"
              defaultValue={editId ? rows.find((r) => r.id === editId)?.telepon : ''}
              required
              requiredMessage="Telepon wajib diisi."
            />
            <FieldError message={fieldErrors.telepon} />
          </div>
          <div>
            <Label>Email (Login)</Label>
            <Input
              type="email"
              name="email"
              placeholder="contoh: pegawai@gmail.com"
              defaultValue={editId ? rows.find((r) => r.id === editId)?.email || '' : ''}
              required
              requiredMessage="Email wajib diisi."
            />
            <FieldError message={fieldErrors.email} />
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
              required
              requiredMessage="Tarif/Jam wajib diisi."
            />
            <FieldError message={fieldErrors.hourly_rate} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="neutral"
              onClick={() => {
                setOpen(false);
                setFormError('');
                setFieldErrors({});
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
          <div className="space-y-6 text-[15px]">
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
