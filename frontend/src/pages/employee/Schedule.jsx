import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";

export default function Schedule() {
  const user = JSON.parse(localStorage.getItem("smpj_user") || "{}");
  const [schedules, setSchedules] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/pegawai/jadwal/${user.id}`);
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        setSchedules(data);
      } catch {
        toast.error("Gagal memuat jadwal Anda");
      }
    })();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Jadwal Saya</CardTitle></CardHeader>
      <CardContent className="divide-y">
        {schedules.length > 0 ? (
          schedules.map((s, i) => (
            <div key={i} className="py-3 flex justify-between">
              <div>
                <div className="font-medium">{s.tanggal} • {s.shift}</div>
                <div className="text-sm text-gray-500">
                  Jam {s.jam_mulai}–{s.jam_selesai}
                </div>
              </div>
              <div className="ds-badge bg-[hsl(var(--muted))]">Shift</div>
            </div>
          ))
        ) : (
          <div className="text-gray-400 py-6 text-center">Tidak ada jadwal</div>
        )}
      </CardContent>
    </Card>
  );
}
