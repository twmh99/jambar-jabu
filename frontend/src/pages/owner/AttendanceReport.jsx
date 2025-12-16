import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input, Label, Select } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
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
  const [listExpanded, setListExpanded] = React.useState(false);
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [exportingCsv, setExportingCsv] = React.useState(false);

  const formatDateDisplay = React.useCallback((value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

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

  const buildParams = React.useCallback(() => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (emp) params.pegawai_id = emp;
    return params;
  }, [from, to, emp]);

  const triggerDownload = React.useCallback((data, headers, fallbackName, mime) => {
    const blob = new Blob([data], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const disposition = headers?.["content-disposition"] || headers?.["Content-Disposition"];
    let filename = fallbackName;
    if (disposition) {
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      if (match?.[1]) {
        filename = match[1];
      }
    }
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }, []);

  const exportReport = React.useCallback(
    async (format) => {
      const setFlag = format === "pdf" ? setExportingPdf : setExportingCsv;
      setFlag(true);
      try {
        const endpoint = format === "pdf" ? "/laporan/absensi/export/pdf" : "/laporan/absensi/export/csv";
        const response = await api.get(endpoint, {
          params: buildParams(),
          responseType: "blob",
        });
        const mime = format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8;";
        const fallback = `laporan-absensi.${format}`;
        triggerDownload(response.data, response.headers, fallback, mime);
      } catch (error) {
        console.error(error);
        toast.error(`Gagal mengunduh laporan ${format.toUpperCase()}`);
      } finally {
        setFlag(false);
      }
    },
    [buildParams, triggerDownload]
  );

  React.useEffect(() => {
    load();
  }, [load]);

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
                <Button
                  type="button"
                  onClick={() => exportReport("csv")}
                  disabled={exportingCsv}
                  className="ds-btn ds-btn-outline flex items-center gap-2"
                >
                  {exportingCsv ? (
                    <i className="fa-solid fa-spinner animate-spin mr-2" />
                  ) : (
                    <i className="fa-solid fa-file-csv mr-2" />
                  )}
                  Ekspor CSV
                </Button>
                <Button
                  type="button"
                  onClick={() => exportReport("pdf")}
                  disabled={exportingPdf}
                  className="ds-btn ds-btn-primary flex items-center gap-2"
                >
                  {exportingPdf ? (
                    <i className="fa-solid fa-spinner animate-spin mr-2" />
                  ) : (
                    <i className="fa-solid fa-file-pdf mr-2" />
                  )}
                  Ekspor PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Hasil</CardTitle>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Total data: <span className="font-semibold text-[hsl(var(--primary))]">{rows.length}</span>
            </p>
          </div>
          {rows.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setListExpanded((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm whitespace-nowrap"
            >
              <i className="fa-solid fa-up-right-and-down-left-from-center" />
              <span>{listExpanded ? "Tutup Tabel" : "Perluas Tabel"}</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title="Belum ada data absensi pada rentang tanggal ini" />
          ) : (
            <Table scrollClassName={listExpanded ? "" : "max-h-[420px] overflow-auto"}>
              <THead className="sticky top-0 z-10">
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
                    <TD>{formatDateDisplay(r.tanggal)}</TD>
                    <TD>{r.pegawai}</TD>
                    <TD>{r.check_in}</TD>
                    <TD>{r.check_out}</TD>
                    <TD>{r.status}</TD>
                    <TD>{new Intl.NumberFormat("id-ID").format(r.tips)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
