import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input, Label, Select } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import DownloadButton from "../../components/common/DownloadButton";
import EmptyState from "../../components/common/EmptyState";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";

const getDefaultRange = () => {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
};

export default function AttendanceReport() {
  const defaultRange = React.useMemo(() => getDefaultRange(), []);
  const [from, setFrom] = React.useState(defaultRange.from);
  const [to, setTo] = React.useState(defaultRange.to);
  const [emp, setEmp] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [emps, setEmps] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const e = await api.get("/pegawai");
        const data = Array.isArray(e.data)
          ? e.data
          : Array.isArray(e.data.data)
          ? e.data.data
          : [];
        setEmps(data);
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat daftar pegawai");
      }
    })();
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/laporan/absensi", { params: emp ? { pegawai_id: emp } : {} });
      const allData = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];

      const all = allData.filter(a => a.tanggal >= from && a.tanggal <= to);
      const mapName = Object.fromEntries(
        (Array.isArray(emps) ? emps : []).map(e => [e.id, e.nama])
      );

      const formatted = all.map(a => ({
        tanggal: a.tanggal,
        pegawai: mapName[a.pegawai_id] || a.pegawai_id,
        check_in: a.check_in || "-",
        check_out: a.check_out || "-",
        status: a.status || "-",
        tips: a.tips || 0,
      }));

      setRows(formatted);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat laporan absensi");
    } finally {
      setLoading(false);
    }
  }, [emp, emps, from, to]);

  React.useEffect(() => {
    load();
  }, [load]);

  const exportPDF = () => {
    if (!rows.length) {
      toast.info("Tidak ada data untuk diekspor");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Pop-up diblokir, izinkan pop-up untuk melanjutkan");
      return;
    }
    const rowsHtml = rows
      .map(
        (r) =>
          `<tr><td>${r.tanggal}</td><td>${r.pegawai}</td><td>${r.check_in}</td><td>${r.check_out}</td><td>${r.status}</td><td>${r.tips}</td></tr>`
      )
      .join("");
    win.document.write(`
      <html>
        <head>
          <title>Laporan Absensi</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Laporan Absensi ${from} s.d. ${to}</h1>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pegawai</th>
                <th>Masuk</th>
                <th>Pulang</th>
                <th>Status</th>
                <th>Tip</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Laporan Absensi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label>Dari</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>Sampai</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Pegawai</Label>
              <Select value={emp} onChange={e => setEmp(e.target.value)}>
                <option value="">Semua Pegawai</option>
                {Array.isArray(emps) && emps.map(e => (
                  <option key={e.id} value={e.id}>{e.nama}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Button onClick={load} disabled={loading}>
              {loading ? (<><i className="fa-solid fa-spinner animate-spin mr-2" /> Memuat...</>)
                        : (<><i className="fa-solid fa-filter mr-2" /> Terapkan</>)}
            </Button>
            {rows.length > 0 && (
              <>
                <DownloadButton filename={`absensi_${from}_sampai_${to}.csv`} rows={rows} />
                <Button type="button" onClick={exportPDF} className="ds-btn ds-btn-primary">
                  <i className="fa-solid fa-file-pdf mr-2" />
                  Ekspor PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Hasil</CardTitle>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Total data: <span className="font-semibold text-[hsl(var(--primary))]">{rows.length}</span>
          </p>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title="Belum ada data absensi pada rentang tanggal ini" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Tanggal</TH>
                    <TH>Pegawai</TH>
                    <TH>Masuk</TH>
                    <TH>Pulang</TH>
                    <TH>Status</TH>
                    <TH>Tip (Rp)</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((r, i) => (
                    <TR key={i}>
                      <TD>{r.tanggal}</TD>
                      <TD>{r.pegawai}</TD>
                      <TD>{r.check_in}</TD>
                      <TD>{r.check_out}</TD>
                      <TD>{r.status}</TD>
                      <TD>{new Intl.NumberFormat("id-ID").format(r.tips)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
