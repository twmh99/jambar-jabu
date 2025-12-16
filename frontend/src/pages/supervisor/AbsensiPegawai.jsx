import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input, Label, Select } from "../../components/ui/input";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";

const STATUS_OPTIONS = ["Hadir", "Terlambat", "Izin", "Alpha", "Menunggu Verifikasi"];

const statusBadgeClass = (status) => {
  switch (status) {
    case "Hadir":
      return "badge-success";
    case "Terlambat":
      return "badge-warning";
    case "Izin":
      return "badge-info";
    case "Alpha":
      return "badge-danger";
    case "Menunggu Verifikasi":
      return "badge-warning";
    case "Belum Check-in":
      return "badge-info";
    default:
      return "badge-info";
  }
};

const getStatusVariant = (status) => {
  switch (status) {
    case "Hadir":
      return "checked";
    case "Terlambat":
    case "Menunggu Verifikasi":
      return "pending";
    case "Alpha":
      return "absent";
    case "Belum Check-in":
      return "info";
    default:
      return "info";
  }
};

const toCSVValue = (val) => {
  if (val === null || val === undefined) return "";
  const safe = String(val).replace(/"/g, '""');
  return `"${safe}"`;
};

export default function AbsensiPegawai() {
  const [rows, setRows] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const load = async () => {
    try {
      const res = await api.get("absensi/today");
      setRows(res.data);
    } catch {
      toast.error("Gagal memuat data absensi");
    }
  };

  const handleExportCSV = () => {
    if (!filteredRows.length) {
      toast.info("Tidak ada data untuk diekspor");
      return;
    }
    const headers = ["Nama Pegawai", "Shift", "Jam Masuk", "Status"];
    const csv = [
      headers.join(","),
      ...filteredRows.map((row) =>
        [row.nama, row.shift, row.jam_masuk, row.status].map(toCSVValue).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "absensi-hari-ini.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!filteredRows.length) {
      toast.info("Tidak ada data untuk diekspor");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Pop-up diblokir, izinkan pop-up untuk melanjutkan");
      return;
    }
    const rowsHtml = filteredRows
      .map(
        (row) =>
          `<tr><td>${row.nama || "-"}</td><td>${row.shift || "-"}</td><td>${row.jam_masuk || "-"}</td><td>${row.status || "-"}</td></tr>`
      )
      .join("");
    win.document.write(`
      <html>
        <head>
          <title>Laporan Absensi Hari Ini</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Laporan Absensi Hari Ini</h1>
          <table>
            <thead>
              <tr>
                <th>Nama Pegawai</th>
                <th>Shift</th>
                <th>Jam Masuk</th>
                <th>Status</th>
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

  React.useEffect(() => {
    load();
  }, []);

  const summary = React.useMemo(() => {
    const hasCheckedIn = (value) =>
      Boolean(value && value !== "—" && value !== "-" && value !== "Belum Check-in");

    const checkedIn = rows.filter((r) => hasCheckedIn(r.jam_masuk)).length;
    const pending = rows.filter((r) => r.status === "Menunggu Verifikasi").length;
    const notCheckedIn = Math.max(rows.length - checkedIn, 0);

    return [
      {
        label: "Sudah Check-in",
        value: checkedIn,
        description: "Pegawai yang tercatat hadir",
      },
      {
        label: "Belum Check-in",
        value: notCheckedIn,
        description: "Belum tercatat jam masuk",
      },
      {
        label: "Menunggu Verifikasi",
        value: pending,
        description: "Butuh validasi supervisor",
      },
    ];
  }, [rows]);

  const filteredRows = React.useMemo(() => {
    const keyword = search.toLowerCase();
    return rows.filter((row) => {
      const matchName = row.nama?.toLowerCase().includes(keyword);
      const matchStatus =
        statusFilter === "ALL" ? true : row.status === statusFilter;
      return matchName && matchStatus;
    });
  }, [rows, search, statusFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Absensi Pegawai Hari Ini</CardTitle>
        <CardDescription>
          Pantau status check-in serta tindak lanjuti kebutuhan verifikasi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4"
            >
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {item.label}
              </p>
              <p className="text-3xl font-semibold mt-2">{item.value}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-3 md:grid-cols-2 md:w-2/3">
            <Label className="text-sm">
              <span className="block text-[hsl(var(--muted-foreground))] mb-1">
                Pencarian Pegawai
              </span>
              <Input
                type="text"
                placeholder="Cari nama pegawai..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Label>
            <Label className="text-sm">
              <span className="block text-[hsl(var(--muted-foreground))] mb-1">
                Filter Status
              </span>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Semua Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </Label>
          </div>
          <div className="flex gap-2">
            <button
              className="ds-btn ds-btn-outline"
              onClick={handleExportCSV}
              type="button"
            >
              <i className="fa-solid fa-file-csv mr-2" />
              Ekspor CSV
            </button>
            <button
              className="ds-btn ds-btn-primary"
              onClick={handleExportPDF}
              type="button"
            >
              <i className="fa-solid fa-file-pdf mr-2" />
              Ekspor PDF
            </button>
          </div>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Nama Pegawai</TH>
              <TH>Shift</TH>
              <TH>Jam Masuk</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {filteredRows.map((r, i) => (
              <TR key={`${r.id || r.nama}-${i}`}>
                <TD>{r.nama || "-"}</TD>
                <TD>{r.shift || "-"}</TD>
              <TD>
                {r.jam_masuk && r.jam_masuk !== "—" && r.jam_masuk !== "-"
                  ? r.jam_masuk
                  : "—"}
              </TD>
              <TD>
                <span
                  className={`badge-status ${statusBadgeClass(r.status)}`}
                  data-variant={getStatusVariant(r.status)}
                >
                  <i className="fa-solid fa-circle text-[8px]" />
                  {r.status || "-"}
                </span>
              </TD>
            </TR>
          ))}
            {filteredRows.length === 0 && (
              <TR>
                <TD
                  colSpan={4}
                  className="text-center py-6 text-[hsl(var(--muted-foreground))]"
                >
                  Tidak ada data sesuai filter
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
