import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { toast } from "../../components/ui/toast";
import Modal from "../../components/common/Modal";
import api from "../../services/api";

const truncate = (text, length = 32) => {
  if (!text) return "—";
  return text.length > length ? `${text.slice(0, length)}…` : text;
};

const normalizeArray = (maybeArray) => {
  if (Array.isArray(maybeArray?.data)) return maybeArray.data;
  if (Array.isArray(maybeArray)) return maybeArray;
  return [];
};

export default function RekapVerifikasi() {
  const [pending, setPending] = React.useState([]);
  const [history, setHistory] = React.useState([]);
  const [pegawai, setPegawai] = React.useState([]);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailData, setDetailData] = React.useState(null);
  const pegawaiMap = React.useMemo(() => {
    const map = new Map();
    pegawai.forEach((p) => map.set(p.id, p));
    return map;
  }, [pegawai]);

  const fetchData = React.useCallback(async () => {
    try {
      const [pendingRes, historyRes, pegawaiRes] = await Promise.all([
        api.get("/absensi/pending"),
        api.get("/absensi"),
        api.get("/pegawai"),
      ]);

      setPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      setHistory(normalizeArray(historyRes.data));
      setPegawai(normalizeArray(pegawaiRes.data));
    } catch (err) {
      console.error("Load rekap error:", err);
      toast.error("Gagal memuat data absensi");
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const verify = async (id) => {
    try {
      await api.post(`/absensi/verify/${id}`);
      toast.success("Absensi diverifikasi");
      await fetchData();
    } catch {
      toast.error("Gagal memverifikasi");
    }
  };

  const openDetail = async (row) => {
    setDetailOpen(true);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/absensi/${row.id}`);
      const data = res.data || {};
      const pegawaiInfo = pegawaiMap.get(data.pegawai_id) || {};
      setDetailData({
        ...row,
        ...data,
        nama: pegawaiInfo.nama || row.nama || `Pegawai #${data.pegawai_id}`,
        jabatan: pegawaiInfo.jabatan,
        foto_url: data.foto_url || data.foto || row.foto_url,
      });
    } catch (err) {
      console.error("Detail absensi error:", err);
      toast.error("Gagal memuat detail absensi");
      setDetailData({ ...row });
    } finally {
      setDetailLoading(false);
    }
  };

  const historyItems = React.useMemo(() => {
    return history
      .filter((item) => item.supervisor_id)
      .map((item) => {
        const pegawaiInfo = pegawaiMap.get(item.pegawai_id) || {};
        const verifiedAt = item.updated_at || item.created_at || item.tanggal;
        return {
          id: item.id,
          nama: pegawaiInfo.nama || `Pegawai #${item.pegawai_id}`,
          jabatan: pegawaiInfo.jabatan || "",
          tanggal: item.tanggal,
          jam_masuk: item.jam_masuk,
          jam_keluar: item.jam_keluar,
          status: item.status,
          supervisor: item.supervisor_name || item.supervisor?.name || `ID ${item.supervisor_id}`,
          verified_at: verifiedAt,
        };
      })
      .sort((a, b) => new Date(b.verified_at) - new Date(a.verified_at))
      .slice(0, 10);
  }, [history, pegawaiMap]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rekap & Verifikasi Absensi</CardTitle>
            <CardDescription>
              Tinjau absensi yang menunggu persetujuan dan buka detail sebelum memverifikasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Nama</TH>
                  <TH>Shift</TH>
                  <TH>Jam Masuk</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {pending.map((p) => (
                  <TR key={p.id}>
                    <TD>{p.nama}</TD>
                    <TD>{p.shift}</TD>
                    <TD>{p.waktu}</TD>
                    <TD>{p.status}</TD>
                    <TD className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => openDetail(p)}
                        className="sm:min-w-[130px]"
                      >
                        <i className="fa-solid fa-eye mr-2" /> Detail
                      </Button>
                      <Button
                        variant="accent"
                        type="button"
                        onClick={() => verify(p.id)}
                        className="sm:min-w-[150px]"
                      >
                        <i className="fa-solid fa-check mr-2" /> Verifikasi
                      </Button>
                    </TD>
                  </TR>
                ))}
                {pending.length === 0 && (
                  <TR>
                    <TD
                      colSpan={5}
                      className="text-center py-6 text-[hsl(var(--muted-foreground))]"
                    >
                      Tidak ada absensi menunggu verifikasi
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Verifikasi</CardTitle>
            <CardDescription>Jejak audit 10 verifikasi terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {historyItems.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Belum ada riwayat verifikasi yang tercatat.
              </p>
            ) : (
              <ol className="space-y-4 text-sm">
                {historyItems.map((item) => (
                  <li
                    key={item.id}
                    className="border border-[hsl(var(--border))] rounded-lg p-3 bg-[hsl(var(--muted))]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.nama}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {item.jabatan || "—"} • {item.status}
                        </p>
                      </div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {new Date(item.verified_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                      Diverifikasi oleh <span className="font-medium">{item.supervisor}</span>
                      <br />
                      Jam masuk {item.jam_masuk || "—"} • Jam keluar {item.jam_keluar || "—"}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={detailOpen}
        title="Detail Absensi"
        onClose={() => setDetailOpen(false)}
        maxWidth="max-w-3xl"
      >
        {detailLoading ? (
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
            Memuat data…
          </p>
        ) : detailData ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">
                  Nama Pegawai
                </p>
                <p className="text-lg font-semibold">{detailData.nama}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {detailData.jabatan || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">
                  Shift
                </p>
                <p className="text-lg font-semibold">{detailData.shift || "—"}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Status: {detailData.status || "—"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Tanggal</p>
                <p className="font-medium">{detailData.tanggal || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Jam Masuk</p>
                <p className="font-medium">{detailData.jam_masuk || detailData.waktu || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Jam Keluar</p>
                <p className="font-medium">{detailData.jam_keluar || "Belum tercatat"}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-dashed border-[hsl(var(--border))] rounded-lg p-4">
                <p className="text-sm font-semibold mb-2">Foto Bukti</p>
                {detailData.foto_url ? (
                  <img
                    src={detailData.foto_url}
                    alt="Bukti absensi"
                    className="rounded-md w-full max-h-64 object-cover"
                  />
                ) : (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Tidak ada foto yang diunggah.
                  </p>
                )}
              </div>
              <div className="border border-dashed border-[hsl(var(--border))] rounded-lg p-4">
                <p className="text-sm font-semibold mb-2">Lokasi / Koordinat</p>
                {detailData.latitude && detailData.longitude ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      Lat: <span className="font-mono">{detailData.latitude}</span>
                      <br />
                      Lng: <span className="font-mono">{detailData.longitude}</span>
                    </p>
                    <a
                      href={`https://maps.google.com/?q=${detailData.latitude},${detailData.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ds-btn ds-btn-outline text-xs"
                    >
                      Buka di Google Maps
                    </a>
                  </div>
                ) : detailData.lokasi ? (
                  <p className="text-sm">{truncate(detailData.lokasi, 80)}</p>
                ) : (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Koordinat atau nama lokasi tidak tersedia.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
            Data absensi tidak ditemukan.
          </p>
        )}
      </Modal>
    </>
  );
}
