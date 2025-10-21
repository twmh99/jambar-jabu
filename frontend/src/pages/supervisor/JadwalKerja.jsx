import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";

export default function JadwalKerja() {
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState([]);

  const load = async () => {
    try {
      const res = await api.get("schedules/week");
      setRows(res.data);
    } catch {
      toast.error("Gagal memuat jadwal kerja");
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) =>
    [r.nama, r.shift, r.tanggal].some((v) => (v || "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Jadwal Kerja Mingguan</CardTitle>
        <Input
          placeholder="Cari nama atau tanggal..."
          className="w-64"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>Nama Pegawai</TH>
              <TH>Shift</TH>
              <TH>Tanggal</TH>
              <TH>Jam Kerja</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((r, i) => (
              <TR key={i}>
                <TD>{r.nama}</TD>
                <TD>{r.shift}</TD>
                <TD>{r.tanggal}</TD>
                <TD>{r.jam_mulai} - {r.jam_selesai}</TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TR><TD colSpan={4} className="text-center py-6 text-[hsl(var(--muted-foreground))]">Tidak ada data</TD></TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
