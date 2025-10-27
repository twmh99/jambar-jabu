import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input, Label, Select } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import DownloadButton from "../../components/common/DownloadButton";
import EmptyState from "../../components/common/EmptyState";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";

/* 🔹 Utility: konversi HH:MM:SS → detik */
const parseHMS = (s) => {
  if (!s) return null;
  const [H, M, S] = s.split(":").map((x) => parseInt(x, 10));
  return H * 3600 + M * 60 + (S || 0);
};

export default function PayrollReport() {
  /* ===== State ===== */
  const [from, setFrom] = useState(() => new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [emp, setEmp] = useState("");
  const [rows, setRows] = useState([]);
  const [emps, setEmps] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ===== Load daftar pegawai ===== */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/pegawai"); // ✅ perbaikan endpoint
        setEmps(res.data?.data || res.data || []);
      } catch (err) {
        console.error("Load employees error:", err.response?.data || err.message);
        toast.error("Gagal memuat daftar pegawai");
      }
    })();
  }, []);

  /* ===== Load data gaji & tip ===== */
  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/laporan/payroll"); // ✅ ambil dari backend Laravel
      const all = Array.isArray(res.data?.data) ? res.data.data : res.data;

      // filter by tanggal
      const filtered = all.filter((a) => a.periode >= from && a.periode <= to);

      // mapping pegawai
      const empMap = Object.fromEntries(emps.map((e) => [e.id, e]));
      const lines = filtered
        .filter((a) => !emp || a.pegawai_id === parseInt(emp))
        .map((a) => {
          const e = empMap[a.pegawai_id];
          const nama = e?.nama || a.nama || "-";
          const rate = e?.hourly_rate || 20000;
          const secIn = parseHMS(a.check_in);
          const secOut = parseHMS(a.check_out);
          const hours =
            secIn !== null && secOut !== null && secOut > secIn ? (secOut - secIn) / 3600 : a.jam_kerja || 0;
          const gaji = a.gaji || Math.round(hours * rate);
          const tip = a.tip || 0;
          return {
            tanggal: a.periode || a.tanggal,
            pegawai: nama,
            jam: hours.toFixed(2),
            rate,
            tips: tip,
            total: gaji + tip,
          };
        });

      setRows(lines);
    } catch (err) {
      console.error("Payroll load error:", err.response?.data || err.message);
      toast.error("Gagal memuat data gaji & tip");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  /* ===== Hitung total ===== */
  const grand = rows.reduce(
    (acc, r) => {
      acc.jam += parseFloat(r.jam);
      acc.tips += r.tips;
      acc.total += r.total;
      return acc;
    },
    { jam: 0, tips: 0, total: 0 }
  );

  /* ===== Render ===== */
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ==================== FILTER ==================== */}
      <Card>
        <CardHeader>
          <CardTitle>Laporan Gaji & Tip</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label>Dari</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>Sampai</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
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

          <div className="flex gap-2">
            <Button onClick={load} disabled={loading}>
              <i className="fa-solid fa-filter mr-2" />
              {loading ? "Memuat..." : "Terapkan"}
            </Button>
            {rows.length > 0 && (
              <DownloadButton filename={`payroll_${from}_sampai_${to}.csv`} rows={rows} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ==================== HASIL ==================== */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Hasil</CardTitle>
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            Total data: <b>{rows.length}</b>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 💰 BAR RINGKASAN TOTAL */}
          {rows.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-md flex justify-around text-center border border-[hsl(var(--muted))]">
              <div>
                <h4 className="text-gray-500 text-sm">Total Jam</h4>
                <p className="text-2xl font-semibold text-[hsl(var(--primary))]">
                  {grand.jam.toFixed(1)} jam
                </p>
              </div>
              <div>
                <h4 className="text-gray-500 text-sm">Total Tip</h4>
                <p className="text-2xl font-semibold text-[hsl(var(--accent))]">
                  Rp{grand.tips.toLocaleString("id-ID")}
                </p>
              </div>
              <div>
                <h4 className="text-gray-500 text-sm">Total Bayar</h4>
                <p className="text-2xl font-semibold text-[hsl(var(--success))]">
                  Rp{grand.total.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          )}

          {/* TABEL HASIL */}
          {rows.length === 0 ? (
            <EmptyState title={loading ? "Memuat data..." : "Belum ada data"} />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Tanggal</TH>
                  <TH>Pegawai</TH>
                  <TH>Jam Kerja</TH>
                  <TH>Rate/Jam</TH>
                  <TH>Tip</TH>
                  <TH>Total</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r, i) => (
                  <TR key={i} className="hover:bg-[hsl(var(--muted))]/20 transition-colors">
                    <TD>{r.tanggal}</TD>
                    <TD>{r.pegawai}</TD>
                    <TD>{r.jam}</TD>
                    <TD>{r.rate.toLocaleString("id-ID")}</TD>
                    <TD>{r.tips.toLocaleString("id-ID")}</TD>
                    <TD className="font-medium text-[hsl(var(--primary))]">
                      {r.total.toLocaleString("id-ID")}
                    </TD>
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
