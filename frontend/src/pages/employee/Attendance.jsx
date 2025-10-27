import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "../../components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/table";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";

export default function Attendance() {
  const user = JSON.parse(localStorage.getItem("smpj_user") || "{}");
  const pegawaiId = user?.pegawai_id || user?.id;
  const [rows, setRows] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/pegawai/absensi/${pegawaiId}`);
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        setRows(data);
      } catch {
        toast.error("Gagal memuat data absensi");
      }
    })();
  }, [pegawaiId]);

  return (
    <Card>
      <CardHeader><CardTitle>Rekap Absensi Saya</CardTitle></CardHeader>
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
            {rows.map((r, i) => (
              <TR key={i}>
                <TD>{r.tanggal}</TD>
                <TD>{r.check_in || "-"}</TD>
                <TD>{r.check_out || "-"}</TD>
                <TD>{r.status || "-"}</TD>
              </TR>
            ))}
            {rows.length === 0 && (
              <TR>
                <TD colSpan={4} className="py-6 text-center text-gray-400">
                  Belum ada data
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
