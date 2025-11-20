import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input, Label, Select } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import DownloadButton from "../../components/common/DownloadButton";
import EmptyState from "../../components/common/EmptyState";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";

const defaultDateRange = () => {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
};

export default function PayrollReport() {
  const initialRange = defaultDateRange();
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [emp, setEmp] = useState("");

  const [rows, setRows] = useState([]);
  const [emps, setEmps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [uploadLabel, setUploadLabel] = useState("Belum ada file");

  // ================================================================
  // 🔹 LOAD PEGAWAI
  // ================================================================
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/pegawai");
        setEmps(res.data?.data || res.data || []);
      } catch {
        toast.error("Gagal memuat daftar pegawai");
      }
    })();
  }, []);

  // ================================================================
  // 🔹 UPLOAD FILE TRANSAKSI
  //    - file diimport di backend
  //    - backend balikin min_date & max_date
  //    - state from/to di-update, user klik "Terapkan" sendiri
  // ================================================================
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setUploadLabel("Belum ada file");
      return;
    }

    setUploadLabel(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/laporan/import-transaksi", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(res.data?.message || "File transaksi berhasil diupload!");

      const minDate = res.data?.min_date;
      const maxDate = res.data?.max_date;

      if (minDate) setFrom(minDate);
      if (maxDate) setTo(maxDate);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Gagal upload file transaksi";
      toast.error(msg);
      setUploadLabel("Belum ada file");
    } finally {
      // reset input supaya bisa upload file yang sama lagi kalau perlu
      e.target.value = "";
    }
  };

  // ================================================================
  // 🔹 LOAD PAYROLL DARI BACKEND
  // ================================================================
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/laporan/payroll", {
        params: {
          dari: from,
          sampai: to,
          pegawai_id: emp || "all",
        },
      });

      const payload = res.data;
      let resolvedRows = [];

      if (Array.isArray(payload)) {
        resolvedRows = payload;
      } else if (Array.isArray(payload?.data)) {
        resolvedRows = payload.data;
      } else if (Array.isArray(payload?.data?.data)) {
        resolvedRows = payload.data.data;
      } else {
        resolvedRows = [];
      }

      setRows(resolvedRows);
      setSummary(payload?.summary || null);
      setWarnings(Array.isArray(payload?.warnings) ? payload.warnings : []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat payroll");
      setRows([]);
      setSummary(null);
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  }, [emp, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // ================================================================
  // 🔹 HITUNG GRAND TOTAL
  // ================================================================
  const grand = rows.reduce(
    (acc, r) => {
      const jam = parseFloat(r.jam_kerja || 0);
      const gajiDasar = r.gaji_dasar || 0;
      const lembur = r.lembur || 0;
      const bonusShift = r.bonus_shift || 0;
      const penalti = r.penalti || 0;
      const tip = r.tip || 0;
      const tipGroup = r.tip_group || 0;
      const total = r.total || 0;

      acc.jam += jam;
      acc.gajiDasar += gajiDasar;
      acc.lembur += lembur;
      acc.bonusShift += bonusShift;
      acc.penalti += penalti;
      acc.tip += tip;
      acc.tipGroup += tipGroup;
      acc.total += total;

      return acc;
    },
    {
      jam: 0,
      gajiDasar: 0,
      lembur: 0,
      bonusShift: 0,
      penalti: 0,
      tip: 0,
      tipGroup: 0,
      total: 0,
    }
  );

  const totalGaji =
    grand.gajiDasar + grand.lembur + grand.bonusShift + grand.penalti;
  const totalTip = grand.tip + grand.tipGroup;

  const totals = summary?.totals;
  const statJam = totals?.jam ?? grand.jam;
  const statGaji = totals?.gaji ?? totalGaji;
  const statTip = totals?.tip ?? totalTip;
  const statTotal = totals?.total ?? grand.total;
  const totalRows = totals?.rows ?? rows.length;

  const formatCurrency = (value) =>
    `Rp${Number(value || 0).toLocaleString("id-ID")}`;
  const formatJam = (value, fraction = 2) =>
    Number(value || 0).toFixed(fraction);

  const exportPayrollPDF = () => {
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
          `<tr>
            <td>${r.tanggal}</td>
            <td>${r.pegawai}</td>
            <td>${r.jam_kerja}</td>
            <td>${r.rate}</td>
            <td>${r.gaji_dasar}</td>
            <td>${r.lembur}</td>
            <td>${r.bonus_shift}</td>
            <td>${r.penalti}</td>
            <td>${r.tip}</td>
            <td>${r.tip_group}</td>
            <td>${r.total}</td>
          </tr>`
      )
      .join("");
    win.document.write(`
      <html>
        <head>
          <title>Laporan Gaji &amp; Tip</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Laporan Gaji &amp; Tip ${from} s.d. ${to}</h1>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pegawai</th>
                <th>Jam Kerja</th>
                <th>Rate/Jam</th>
                <th>Gaji Dasar</th>
                <th>Lembur</th>
                <th>Bonus Shift</th>
                <th>Penalti</th>
                <th>Tip</th>
                <th>Tip Group</th>
                <th>Total</th>
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
    <div className="space-y-6 animate-fadeIn">
      {/* ========================= FILTER ========================= */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Laporan Gaji & Tip</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sesuaikan rentang tanggal atau unggah transaksi terbaru.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Dari</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Sampai</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="space-y-1 sm:col-span-2 lg:col-span-2">
              <Label>Pegawai</Label>
              <Select value={emp} onChange={(e) => setEmp(e.target.value)}>
                <option value="">Semua Pegawai</option>
                {emps.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nama}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 items-center flex-wrap">
              <Button onClick={load} disabled={loading}>
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin mr-2" /> Memuat...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-filter mr-2" /> Terapkan
                  </>
                )}
              </Button>

              {rows.length > 0 && (
                <>
                  <DownloadButton
                    filename={`payroll_${from}_sampai_${to}.csv`}
                    rows={rows}
                  />
                  <Button type="button" onClick={exportPayrollPDF} className="ds-btn ds-btn-primary">
                    <i className="fa-solid fa-file-pdf mr-2" />
                    Ekspor PDF
                  </Button>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1 w-full max-w-[240px]">
              <Label
                htmlFor="payroll-upload"
                className="text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                Upload Transaksi
              </Label>
              <label
                htmlFor="payroll-upload"
                className="ds-btn ds-btn-outline flex items-center justify-center gap-2 px-4 py-1.5 text-sm min-h-[38px]"
              >
                <i className="fa-solid fa-upload" />
                Pilih File
              </label>
              <span className="text-[11px] text-muted-foreground text-right truncate">
                {uploadLabel}
              </span>
              <input
                id="payroll-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleUpload}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================= HASIL ========================= */}
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>Hasil</CardTitle>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Total data: <span className="font-semibold text-[hsl(var(--primary))]">{totalRows}</span>
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {warnings.length > 0 && (
            <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 rounded-md p-3 text-sm space-y-1">
              <p className="font-semibold">Validasi Sistem</p>
              <ul className="list-disc pl-5 space-y-1">
                {warnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-md border">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <h4 className="text-sm text-gray-500">Total Jam</h4>
                  <p className="text-2xl font-semibold">
                  {formatJam(statJam, 1)} jam
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm text-gray-500">Total Gaji</h4>
                  <p className="text-2xl font-semibold text-blue-600">
                    {formatCurrency(statGaji)}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm text-gray-500">Total Tip</h4>
                  <p className="text-2xl font-semibold text-yellow-600">
                    {formatCurrency(statTip)}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm text-gray-500">Total Bayar</h4>
                  <p className="text-2xl font-semibold text-green-600">
                    {formatCurrency(statTotal)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <EmptyState
              title={loading ? "Memuat data..." : "Belum ada data"}
              description="Silakan atur rentang tanggal dan klik Terapkan."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Tanggal</TH>
                    <TH>Pegawai</TH>
                    <TH>Jam Kerja</TH>
                    <TH>Rate/Jam</TH>
                    <TH>Gaji Dasar</TH>
                    <TH>Lembur</TH>
                    <TH>Bonus Shift</TH>
                    <TH>Penalti</TH>
                    <TH>Tip</TH>
                    <TH>Tip Group</TH>
                    <TH>Total</TH>
                  </TR>
                </THead>

                <TBody>
                  {rows.map((r, i) => (
                    <TR key={i}>
                      <TD>{r.tanggal}</TD>
                      <TD>{r.pegawai}</TD>
                      <TD>{formatJam(r.jam_kerja)}</TD>
                      <TD>{formatCurrency(r.rate)}</TD>
                      <TD>{formatCurrency(r.gaji_dasar)}</TD>
                      <TD>{formatCurrency(r.lembur)}</TD>
                      <TD>{formatCurrency(r.bonus_shift)}</TD>
                      <TD>{formatCurrency(r.penalti)}</TD>
                      <TD>{formatCurrency(r.tip)}</TD>
                      <TD>{formatCurrency(r.tip_group)}</TD>
                      <TD>{formatCurrency(r.total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================= RINGKASAN ========================= */}
      {summary && (
        <>
          {summary.daily?.length > 0 && (
            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle>Ringkasan Harian</CardTitle>
                <span className="text-sm text-muted-foreground">{summary.daily.length} hari</span>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Tanggal</TH>
                      <TH>Total Jam</TH>
                      <TH>Total Gaji</TH>
                      <TH>Total Tip</TH>
                      <TH>Total Bayar</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {summary.daily.map((d, idx) => (
                      <TR key={`daily-${idx}`}>
                        <TD>{d.tanggal}</TD>
                        <TD>{formatJam(d.total_jam)}</TD>
                        <TD>{formatCurrency(d.total_gaji)}</TD>
                        <TD>{formatCurrency(d.total_tip)}</TD>
                        <TD>{formatCurrency(d.total_bayar)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {summary.weekly?.length > 0 && (
            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle>Ringkasan Mingguan</CardTitle>
                <span className="text-sm text-muted-foreground">{summary.weekly.length} minggu</span>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Minggu</TH>
                      <TH>Total Jam</TH>
                      <TH>Total Gaji</TH>
                      <TH>Total Tip</TH>
                      <TH>Total Bayar</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {summary.weekly.map((d, idx) => (
                      <TR key={`weekly-${idx}`}>
                        <TD>
                          <div className="font-medium">{d.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.range}
                          </div>
                        </TD>
                        <TD>{formatJam(d.total_jam)}</TD>
                        <TD>{formatCurrency(d.total_gaji)}</TD>
                        <TD>{formatCurrency(d.total_tip)}</TD>
                        <TD>{formatCurrency(d.total_bayar)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {summary.monthly?.length > 0 && (
            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle>Ringkasan Bulanan</CardTitle>
                <span className="text-sm text-muted-foreground">{summary.monthly.length} bulan</span>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Bulan</TH>
                      <TH>Total Jam</TH>
                      <TH>Total Gaji</TH>
                      <TH>Total Tip</TH>
                      <TH>Total Bayar</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {summary.monthly.map((d, idx) => (
                      <TR key={`monthly-${idx}`}>
                        <TD>{d.label}</TD>
                        <TD>{formatJam(d.total_jam)}</TD>
                        <TD>{formatCurrency(d.total_gaji)}</TD>
                        <TD>{formatCurrency(d.total_tip)}</TD>
                        <TD>{formatCurrency(d.total_bayar)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
