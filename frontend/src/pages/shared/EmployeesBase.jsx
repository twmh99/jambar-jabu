import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TBody, THead, TH, TR, TD } from '../../components/ui/table';
import { Input, Label, Select } from '../../components/ui/input';
import { toast } from '../../components/ui/toast';
import Modal from '../../components/common/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import api from '../../services/api';

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
  const pageSize = 8;

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
      toast.error('Lengkapi nama, jabatan, dan telepon.');
      return;
    }

    try {
      setLoading(true);
      let res;

      if (editId) {
        res = await api.put(`/pegawai/${editId}`, data);
        const updated = res.data?.data?.pegawai || res.data?.pegawai || res.data || data;
        setRows((prev) =>
          prev.map((r) => (r.id === editId ? { ...r, ...updated } : r))
        );
        toast.success('Data pegawai berhasil diperbarui.');
      } else {
        res = await api.post('/pegawai', data);
        const newPegawai =
          res.data?.data?.pegawai || res.data?.pegawai || res.data || null;
        if (newPegawai && newPegawai.id) {
          setRows((prev) => [newPegawai, ...prev]);
        } else {
          await loadEmployees();
        }
        toast.success(`Pegawai "${data.nama}" berhasil ditambahkan.`);
      }

      setOpen(false);
      setEditId(null);
      e.target.reset();
    } catch (err) {
      console.error('Save error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Gagal menyimpan pegawai!');
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
  const filtered = Array.isArray(rows)
    ? rows.filter((r) => {
      const s = q.toLowerCase();
      return [r.nama, r.jabatan, r.telepon, r.status].some((v) =>
        (v || '').toLowerCase().includes(s)
      );
    })
    : [];

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <ConfirmDeleteModal
        open={showDelete}
        onCancel={() => setShowDelete(false)}
        onConfirm={handleDeleteConfirm}
        targetName={rows[deleteTarget]?.nama}
      />

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>
            {role === 'supervisor'
              ? 'Data Pegawai (Supervisor)'
              : 'Data Pegawai (Owner)'}
          </CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Cari nama/jabatan/telepon..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="w-64"
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
        </CardHeader>

        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH>Jabatan</TH>
                <TH>Telepon</TH>
                <TH>Status</TH>
                <TH className="text-right">Aksi</TH>
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
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
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
        onClose={() => setOpen(false)}
      >
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Nama</Label>
            <Input
              name="nama"
              defaultValue={editId ? rows.find((r) => r.id === editId)?.nama : ''}
              required
            />
          </div>
          <div>
            <Label>Jabatan</Label>
            <Input
              name="jabatan"
              defaultValue={editId ? rows.find((r) => r.id === editId)?.jabatan : ''}
              required
            />
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
            <Select
              name="role"
              defaultValue={
                editId
                  ? rows.find((r) => r.id === editId)?.role || 'employee'
                  : 'employee'
              }
            >
              <option value="employee">Pegawai</option>
              <option value="supervisor">Supervisor</option>
              <option value="owner">Owner</option>
            </Select>
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
              defaultValue={
                editId
                  ? rows.find((r) => r.id === editId)?.hourly_rate || 20000
                  : 20000
              }
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </button>
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
          <div className="max-h-[70vh] overflow-y-auto space-y-5 text-[15px]">
            {/* === Header Detail === */}
            <div className="flex justify-between items-start mb-2">
              <div className="text-center w-full">
                <h2 className="text-lg font-semibold text-[hsl(var(--primary))]">
                  {selectedPegawai.nama}
                </h2>
                <p className="text-[hsl(var(--muted-foreground))]">
                  {selectedPegawai.jabatan || '—'}
                </p>
              </div>
<Button
  size="sm"
  onClick={() => {
    setDetailOpen(false);
    setEditId(selectedPegawai.id);
    setOpen(true);
  }}
  className="ml-3 flex items-center gap-2 text-white hover:text-yellow-200 transition-colors duration-200"
>
  <i className="fa-solid fa-pen text-yellow-400 hover:text-yellow-300 transition-colors duration-200" />
  <span>Edit</span>
</Button>
            </div>

            {/* === Detail Grid === */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                <strong className="block text-[13px] text-[hsl(var(--muted-foreground))]">
                  Telepon
                </strong>
                <span>{selectedPegawai.telepon || '-'}</span>
              </div>
              <div className="p-3 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                <strong className="block text-[13px] text-[hsl(var(--muted-foreground))]">
                  Email
                </strong>
                <span>{selectedPegawai.email || '-'}</span>
              </div>
              <div className="p-3 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                <strong className="block text-[13px] text-[hsl(var(--muted-foreground))]">
                  Role
                </strong>
                <span className="capitalize">{selectedPegawai.role || '-'}</span>
              </div>
              <div className="p-3 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                <strong className="block text-[13px] text-[hsl(var(--muted-foreground))]">
                  Status
                </strong>
                <span
                  className={`ds-badge ${selectedPegawai.status === 'Aktif'
                    ? 'bg-[hsl(var(--success))] text-white'
                    : 'bg-[hsl(var(--muted))]'
                    }`}
                >
                  {selectedPegawai.status}
                </span>
              </div>
              <div className="sm:col-span-2 p-3 rounded-xl border bg-[hsl(var(--card))] shadow-sm">
                <strong className="block text-[13px] text-[hsl(var(--muted-foreground))]">
                  Tarif/Jam
                </strong>
                <span>
                  Rp {selectedPegawai.hourly_rate?.toLocaleString('id-ID') || 0}
                </span>
              </div>
            </div>

            {/* Tombol Tutup */}
            <div className="flex justify-end pt-2">
              <button onClick={() => setDetailOpen(false)} className="btn-outline">
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
