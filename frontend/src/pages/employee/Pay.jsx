import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/table";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";

export default function Pay() {
  const user = JSON.parse(localStorage.getItem("smpj_user") || "{}");
  const [rows, setRows] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/pegawai/gaji/${user.id}`);
        setRows(res.data || []);
      } catch {
        toast.error("Gagal memuat gaji & tip");
      }
    })();
  }, []);

  const total = rows.reduce(
    (acc, r) => ({
      jam: acc.jam + parseFloat(r.jam || 0),
      tips: acc.tips + (r.tips || 0),
      total: acc.total + (r.total || 0),
    }),
    { jam: 0, tips: 0, total: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gaji & Tip Saya</CardTitle>
        <div className="text-sm text-gray-500">
          Total Jam: <b>{total.jam.toFixed(2)}</b> • Total Tip: <b>{total.tips.toLocaleString("id-ID")}</b> • Total Gaji: <b>{total.total.toLocaleString("id-ID")}</b>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <THead><TR><TH>Tanggal</TH><TH>Jam</TH><TH>Rate</TH><TH>Tip</TH><TH>Total</TH></TR></THead>
          <TBody>
            {rows.map((r, i) => (
              <TR key={i}>
                <TD>{r.tanggal}</TD><TD>{r.jam}</TD>
                <TD>{r.rate.toLocaleString("id-ID")}</TD>
                <TD>{r.tips.toLocaleString("id-ID")}</TD>
                <TD>{r.total.toLocaleString("id-ID")}</TD>
              </TR>
            ))}
            {rows.length === 0 && (
              <TR><TD colSpan={5} className="py-6 text-center text-gray-400">Belum ada data</TD></TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
