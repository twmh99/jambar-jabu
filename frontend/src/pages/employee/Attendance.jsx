import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "../../components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";

const STATUS_FILTERS = ["Semua", "Hadir", "Terlambat", "Izin", "Alpha"];

export default function Attendance() {
  const user = JSON.parse(localStorage.getItem("smpj_user") || "{}");
  const pegawaiId = user?.pegawai_id || user?.pegawai?.id || user?.id;
  const [rows, setRows] = React.useState([]);
  const [filter, setFilter] = React.useState("Semua");

  React.useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/pegawai/absensi/${pegawaiId}`);
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setRows(data);
      } catch {
        toast.error("Gagal memuat data absensi");
      }
    })();
  }, [pegawaiId]);

  const filteredRows = rows.filter((r) => {
    if (filter === "Semua") return true;
    return (r.status || "-").toLowerCase() === filter.toLowerCase();
  });

  const downloadCSV = () => {
    const header = ["Tanggal", "Masuk", "Pulang", "Status"];
    const csvRows = filteredRows.map((r) => [
      r.tanggal,
      r.jam_masuk || r.check_in || "-",
      r.jam_keluar || r.check_out || "-",
      r.status || "-",
    ]);
    const csvContent = [header, ...csvRows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "absensi_saya.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Rekap Absensi Saya</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total catatan: <strong>{filteredRows.length}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => {
            const isActive = filter === status;
            const colorClass = (() => {
              if (status === "Hadir") return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
              if (status === "Terlambat") return "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100";
              if (status === "Izin") return "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100";
              if (status === "Alpha") return "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100";
              return "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20";
            })();
            return (
              <Button
                key={status}
                size="sm"
                variant="outline"
                className={isActive ? `shadow-sm ${colorClass}` : ""}
                onClick={() => setFilter(status)}
              >
                {status}
              </Button>
            );
          })}
          <Button size="sm" variant="outline" onClick={downloadCSV}>
            <i className="fa-solid fa-download mr-2" /> Unduh CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>Tanggal</TH>
              <TH>Masuk</TH>
              <TH>Pulang</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {filteredRows.map((r, i) => (
              <TR key={i}>
                <TD>{r.tanggal}</TD>
                <TD>{r.jam_masuk || r.check_in || "-"}</TD>
                <TD>{r.jam_keluar || r.check_out || "-"}</TD>
                <TD>{r.status || "-"}</TD>
              </TR>
            ))}
            {filteredRows.length === 0 && (
              <TR>
                <TD colSpan={4} className="py-6 text-center text-gray-400">
                  Tidak ada data dengan filter ini
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
