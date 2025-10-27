import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { toast } from "../../components/ui/toast";
import api from "../../services/api";

export default function AbsensiPegawai() {
  const [rows, setRows] = React.useState([]);

  const load = async () => {
    try {
      const res = await api.get("absensi/today");
      setRows(res.data);
    } catch {
      toast.error("Gagal memuat data absensi");
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Absensi Pegawai Hari Ini</CardTitle>
      </CardHeader>
      <CardContent>
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
            {rows.map((r, i) => (
              <TR key={i}>
                <TD>{r.nama}</TD>
                <TD>{r.shift}</TD>
                <TD>{r.jam_masuk}</TD>
                <TD>
                  <span
                    className={`ds-badge ${
                      r.status === "Terlambat"
                        ? "bg-[hsl(var(--warning))]"
                        : "bg-[hsl(var(--success))]"
                    } text-white`}
                  >
                    {r.status}
                  </span>
                </TD>
              </TR>
            ))}
            {rows.length === 0 && (
              <TR><TD colSpan={4} className="text-center py-6 text-[hsl(var(--muted-foreground))]">Belum ada absensi hari ini</TD></TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
