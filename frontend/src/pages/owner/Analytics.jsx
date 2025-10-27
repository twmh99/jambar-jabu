import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";

export default function Analytics() {
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/laporan/analisis");
        setTrend(res.data?.top_performers || []);
      } catch (err) {
        console.error("Analisis error:", err.response?.data || err.message);
        toast.error("Gagal memuat analisis kinerja");
      }
    })();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Kinerja Pegawai (Top 5 Kehadiran)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="pegawai.nama" />
              <YAxis />
              <Tooltip formatter={(v) => [`${v} hari`, "Kehadiran"]} />
              <Line
                type="monotone"
                dataKey="total_kehadiran"
                stroke="#f7c948"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
