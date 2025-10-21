import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TBody, THead, TH, TR, TD } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";

export default function RekapVerifikasi() {
  const [pending, setPending] = React.useState([]);

  const load = async () => {
    try {
      const res = await api.get("attendance/pending");
      setPending(res.data);
    } catch {
      toast.error("Gagal memuat absensi tertunda");
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const verify = async (id) => {
    try {
      await api.post(`attendance/verify/${id}`);
      toast.success("Absensi diverifikasi");
      await load();
    } catch {
      toast.error("Gagal memverifikasi");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rekap & Verifikasi Absensi</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>Nama</TH>
              <TH>Shift</TH>
              <TH>Waktu Masuk</TH>
              <TH>Status</TH>
              <TH>Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {pending.map((p, i) => (
              <TR key={i}>
                <TD>{p.nama}</TD>
                <TD>{p.shift}</TD>
                <TD>{p.waktu}</TD>
                <TD>{p.status}</TD>
                <TD>
                  <Button variant="accent" onClick={() => verify(p.id)}>
                    <i className="fa-solid fa-check mr-2" /> Verifikasi
                  </Button>
                </TD>
              </TR>
            ))}
            {pending.length === 0 && (
              <TR><TD colSpan={5} className="text-center py-6 text-[hsl(var(--muted-foreground))]">Tidak ada absensi menunggu verifikasi</TD></TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
