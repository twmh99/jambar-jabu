import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "../../components/ui/toast";
import api from "../../lib/api";

export default function LaporanPeriodik() {
  const [data, setData] = React.useState([]);

  const load = async () => {
    try {
      const res = await api.get("attendance/report/weekly");
      setData(res.data);
    } catch {
      toast.error("Gagal memuat laporan");
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Kehadiran Mingguan</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
            <XAxis dataKey="minggu" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="kehadiran" stroke="#0b2545" strokeWidth={3} />
            <Line type="monotone" dataKey="produktivitas" stroke="#f7c948" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
