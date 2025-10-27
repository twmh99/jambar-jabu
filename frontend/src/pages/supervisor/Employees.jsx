// ...imports tetap
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TBody, THead, TH, TR, TD } from '../../components/ui/table';
import { Input, Label, Select } from '../../components/ui/input';
import { toast } from '../../components/ui/toast';
import Modal from '../../components/common/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import api from '../../services/api';

export default function SupervisorEmployees() {
  const [rows, setRows] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState(null);
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 8;
  const [sortKey, setSortKey] = React.useState('nama');
  const [sortAsc, setSortAsc] = React.useState(true);
  const [showDelete, setShowDelete] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedPegawai, setSelectedPegawai] = React.useState(null);

  const load = async () => {
    try {
      const res = await api.get('/pegawai');
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];
      setRows(data);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data pegawai');
    }
  };

  React.useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    if (!data.nama || !data.jabatan || !data.telepon) {
      toast.error('Lengkapi nama/jabatan/telepon');
      return;
    }
    try {
      if (edit !== null) {
        await api.put(`/pegawai/${rows[edit].id}`, data);
        toast.success('Data pegawai diperbarui');
      } else {
        await api.post('/pegawai', data);
        toast.success('Pegawai baru berhasil ditambahkan');
      }
      setOpen(false);
      setEdit(null);
      await load();
    } catch (err) {
      console.error('Save error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Gagal menyimpan data pegawai');
    }
  };

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
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus data pegawai');
    }
  };

  const showDetail = async (pegawai) => {
    try {
      const res = await api.get(`/pegawai/profil/${pegawai.id}`);
      const data = res.data?.data || pegawai;
      setSelectedPegawai(data);
      setDetailOpen(true);
    } catch (err) {
      console.error('Gagal load detail:', err);
      toast.error('Gagal memuat detail pegawai');
      setSelectedPegawai(pegawai);
      setDetailOpen(true);
    }
  };

  const filtered = Array.isArray(rows)
    ? rows
        .filter((r) => {
          const s = q.toLowerCase();
          return [r.nama, r.jabatan, r.telepon, r.status].some((v) =>
            (v || '').toLowerCase().includes(s)
          );
        })
        .sort((a, b) => {
          const av = (a[sortKey] || '').toString().toLowerCase();
          const bv = (b[sortKey] || '').toString().toLowerCase();
          if (av < bv) return sortAsc ? -1 : 1;
          if (av > bv) return sortAsc ? 1 : -1;
          return 0;
        })
    : [];

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const changeSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

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
          <CardTitle>Data Pegawai</CardTitle>
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
                setEdit(null);
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
                <TH className="cursor-pointer" onClick={() => changeSort('nama')}>
                  Nama {sortKey === 'nama' ? (sortAsc ? '▲' : '▼') : ''}
                </TH>
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
                          ? 'ds-badge bg-[hsl(var(--success))] text-white'
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
                          setEdit((page - 1) * pageSize + idx);
                          setOpen(true);
                        }}
                        className="px-2 py-1 rounded-md text-sm text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] transition"
                        title="Edit pegawai"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmRemove((page - 1) * pageSize + idx);
                        }}
                        className="px-2 py-1 rounded-md text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--muted))] transition"
                        title="Hapus pegawai"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))}
              {paged.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-6 text-center text-[hsl(var(--muted-foreground))]">
                    Tidak ada data
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail */}
      {detailOpen && selectedPegawai && (
        <Modal open={detailOpen} title="Detail Pegawai" onClose={() => setDetailOpen(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><strong>Nama:</strong> {selectedPegawai.nama}</div>
            <div><strong>Jabatan:</strong> {selectedPegawai.jabatan}</div>
            <div><strong>Telepon:</strong> {selectedPegawai.telepon}</div>
            <div><strong>Status:</strong> {selectedPegawai.status}</div>
            <div><strong>Email:</strong> {selectedPegawai.email || '-'}</div>
            <div>
              <strong>Role:</strong>{' '}
              {selectedPegawai.role === 'owner'
                ? 'Owner'
                : selectedPegawai.role === 'supervisor'
                ? 'Supervisor'
                : 'Pegawai'}
            </div>
            <div>
              <strong>Tarif/Jam:</strong> Rp{' '}
              {new Intl.NumberFormat('id-ID').format(selectedPegawai.hourly_rate || 0)}
            </div>
          </div>
        </Modal>
      )}

      {/* Form */}
      <Modal open={open} title={edit !== null ? 'Ubah Pegawai' : 'Tambah Pegawai'} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Nama</Label>
            <Input name="nama" defaultValue={edit !== null ? rows[edit].nama : ''} required />
          </div>
          <div><Label>Jabatan</Label>
            <Input name="jabatan" defaultValue={edit !== null ? rows[edit].jabatan : ''} required />
          </div>
          <div><Label>Telepon</Label>
            <Input name="telepon" defaultValue={edit !== null ? rows[edit].telepon : ''} required />
          </div>
          <div><Label>Status</Label>
            <Select name="status" defaultValue={edit !== null ? rows[edit].status : 'Aktif'}>
              <option>Aktif</option><option>Nonaktif</option>
            </Select>
          </div>
          <div><Label>Tarif/Jam (IDR)</Label>
            <Input type="number" name="hourly_rate" min="0" step="1000"
              defaultValue={edit !== null ? rows[edit].hourly_rate || 20000 : 20000} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="ds-btn ds-btn-outline" onClick={() => setOpen(false)}>
              Batal
            </button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
