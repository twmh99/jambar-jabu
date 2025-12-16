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
import Modal from "../../components/common/Modal";

const defaultDateRange = () => {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
};

const CLEAR_KEYWORDS = ["BERSIHKAN", "HAPUS", "KONFIRMASI", "BERSIHKAN RIWAYAT"];

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
  const [importHistory, setImportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearKeyword, setClearKeyword] = useState(CLEAR_KEYWORDS[0]);
  const [clearInput, setClearInput] = useState("");
  const [clearingHistory, setClearingHistory] = useState(false);

  // ================================================================
  // 🔹 Riwayat Import
  // ================================================================
  const loadImportHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/laporan/import-transaksi/history");
      setImportHistory(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat riwayat import.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openClearHistoryModal = () => {
    const randomWord =
      CLEAR_KEYWORDS[Math.floor(Math.random() * CLEAR_KEYWORDS.length)];
    setClearKeyword(randomWord);
    setClearInput("");
    setClearModalOpen(true);
  };

  const handleClearHistory = async () => {
    const typed = clearInput.trim();
    if (typed.toUpperCase() !== clearKeyword.toUpperCase()) {
      toast.error("Kata konfirmasi tidak sesuai.");
      return;
    }
    setClearingHistory(true);
    try {
      await api.delete("/laporan/import-transaksi/history", {
        data: {
          confirm_word: typed,
          expected_word: clearKeyword,
        },
      });
      toast.success("Riwayat import berhasil dibersihkan.");
      setClearModalOpen(false);
      setClearInput("");
      loadImportHistory();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Gagal membersihkan riwayat";
      toast.error(msg);
    } finally {
      setClearingHistory(false);
    }
  };

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
    loadImportHistory();
  }, [loadImportHistory]);

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
      loadImportHistory();
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

  const parseClientDate = (value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    let normalized = value;
    if (typeof normalized === "string" && !normalized.includes("T")) {
      normalized = `${normalized.replace(" ", "T")}Z`;
    }
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDateTime = (value) => {
    const parsed = parseClientDate(value);
    if (!parsed) return value || "-";
    return parsed.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (value) => {
    const parsed = parseClientDate(value);
    if (!parsed) return value || "-";
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateRange = (meta) => {
    if (!meta || (!meta?.min_date && !meta?.max_date)) return "-";
    const fromLabel = meta?.min_date ? formatDateOnly(meta.min_date) : "-";
    const toLabel = meta?.max_date ? formatDateOnly(meta.max_date) : "-";
    return `${fromLabel} s/d ${toLabel}`;
  };

  const formatWeekLabel = (label) => {
    if (!label) return "-";
    const match = label.match(/Minggu\s+(\d+)\s+(\d{4})/i);
    if (match) {
      const [, week, year] = match;
      return `Minggu ke-${week} (${year})`;
    }
    return label;
  };

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

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Riwayat Import Transaksi</CardTitle>
            {importHistory.length > 0 && (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Total data: <span className="font-semibold text-[hsl(var(--primary))]">{importHistory.length}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={loadImportHistory}
              disabled={historyLoading}
              className="whitespace-nowrap"
            >
              {historyLoading ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin mr-2" /> Memuat...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-arrows-rotate mr-2" /> Refresh
                </>
              )}
            </Button>
            {importHistory.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setHistoryExpanded((prev) => !prev)}
                className="whitespace-nowrap"
              >
                {historyExpanded ? (
                  <>
                    <i className="fa-solid fa-down-left-and-up-right-to-center mr-2" /> Tutup Tabel
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-up-right-and-down-left-from-center mr-2" /> Perluas Tabel
                  </>
                )}
              </Button>
            )}
            {importHistory.length > 0 && (
              <Button
                type="button"
                variant="destructive"
                onClick={openClearHistoryModal}
                className="whitespace-nowrap flex items-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#ef4444] text-white px-4 py-2 border border-[#dc2626]"
              >
                <i className="fa-solid fa-broom text-white" />
                Bersihkan Riwayat
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {importHistory.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat."
              subtitle="Upload file transaksi untuk melihat catatan riwayat import di sini."
            />
          ) : (
            <Table
              scrollClassName={
                historyExpanded ? "" : "max-h-[320px] overflow-auto"
              }
            >
              <THead className="sticky top-0 z-10">
                <TR>
                  <TH className="whitespace-nowrap text-left">Nama File</TH>
                  <TH className="whitespace-nowrap text-center">Tanggal Upload</TH>
                  <TH className="whitespace-nowrap text-center">Rentang Tanggal</TH>
                  <TH className="whitespace-nowrap text-center">Diunggah Oleh</TH>
                </TR>
              </THead>
              <TBody>
                {importHistory.map((item) => (
                  <TR key={item.id}>
                    <TD className="font-medium text-[hsl(var(--foreground))]">
                      {item.file_name}
                    </TD>
                    <TD className="whitespace-nowrap text-center">
                      {formatDateTime(item.imported_at || item.created_at)}
                    </TD>
                    <TD className="text-center">{formatDateRange(item.meta)}</TD>
                    <TD className="text-center">{item.uploaded_by || "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
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
                      <TD>{formatDateOnly(r.tanggal)}</TD>
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
                        <TD>{formatDateOnly(d.tanggal)}</TD>
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
                          <div className="font-medium">{formatWeekLabel(d.label)}</div>
                          <div className="text-xs text-muted-foreground">{d.range}</div>
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

      <Modal
        open={clearModalOpen}
        title="Bersihkan Riwayat Import"
        onClose={() => {
          if (!clearingHistory) {
            setClearModalOpen(false);
            setClearInput("");
          }
        }}
      >
        <div className="space-y-4 text-sm">
          <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">
            Tindakan ini akan menghapus seluruh riwayat import transaksi. Ketik{" "}
            <span className="font-semibold text-[hsl(var(--primary))]">
              {clearKeyword}
            </span>{" "}
            untuk melanjutkan.
          </p>
          <Input
            value={clearInput}
            onChange={(e) => setClearInput(e.target.value)}
            placeholder={clearKeyword}
            disabled={clearingHistory}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!clearingHistory) {
                  setClearModalOpen(false);
                  setClearInput("");
                }
              }}
              disabled={clearingHistory}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleClearHistory}
              disabled={clearingHistory}
              className="flex items-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#ef4444] text-white px-4 py-2 border border-[#dc2626]"
            >
              {clearingHistory ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-broom" />
                  Bersihkan
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
