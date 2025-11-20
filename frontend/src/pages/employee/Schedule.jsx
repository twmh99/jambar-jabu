import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input, Select, Label } from "../../components/ui/input";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";

const SHIFTS = ["Semua Shift", "Pagi", "Siang", "Malam"];
const FILTER_MODES = [
  { value: "all", label: "Semua Tanggal" },
  { value: "day", label: "Per Hari" },
  { value: "month", label: "Per Bulan" },
];

const shiftClass = (shift = "") => {
  const key = shift.toLowerCase();
  if (key === "pagi") return "bg-amber-100 text-amber-800";
  if (key === "siang") return "bg-sky-100 text-sky-800";
  if (key === "malam") return "bg-indigo-100 text-indigo-800";
  return "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]";
};

export default function Schedule() {
  const user = JSON.parse(localStorage.getItem("smpj_user") || "{}");
  const pegawaiId = user?.pegawai_id || user?.pegawai?.id || user?.id;
  const [schedules, setSchedules] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [shiftFilter, setShiftFilter] = React.useState("Semua Shift");
  const [mode, setMode] = React.useState("all");
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split("T")[0];
  });
  const startOfWeek = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    return d.toISOString().split("T")[0];
  };
  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date().toISOString().split("T")[0]));

  const fetchSchedule = React.useCallback(
    async (dateParam = selectedDate, modeParam = mode, shiftParam = shiftFilter) => {
      if (!pegawaiId) return;
      setLoading(true);
      try {
        const res = await api.get(`/pegawai/jadwal/${pegawaiId}`, {
          params: {
            tanggal: modeParam === "all" ? undefined : dateParam,
            jenis: modeParam,
            shift: shiftParam !== "Semua Shift" ? shiftParam : undefined,
          },
        });
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setSchedules(data);
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat jadwal Anda");
      } finally {
        setLoading(false);
      }
    },
    [pegawaiId, selectedDate, mode, shiftFilter]
  );

  React.useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  React.useEffect(() => {
    setWeekStart(startOfWeek(selectedDate));
  }, [selectedDate]);

  const filteredSchedules = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return schedules.filter((item) => {
      if (!keyword) return true;
      return (
        item.tanggal?.toLowerCase().includes(keyword) ||
        (item.shift || "").toLowerCase().includes(keyword)
      );
    });
  }, [schedules, search]);

  const weekDays = React.useMemo(() => {
    const base = new Date(weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return {
        date: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("id-ID", { weekday: "short" }),
        day: d.getDate(),
      };
    });
  }, [weekStart]);

  const weekSchedules = React.useMemo(() => {
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6);
    return filteredSchedules.filter((item) => {
      if (!item?.tanggal) return false;
      return item.tanggal >= weekStart && item.tanggal <= endDate.toISOString().split("T")[0];
    });
  }, [filteredSchedules, weekStart]);

  const selectedSchedule = filteredSchedules.find((s) => s.tanggal === selectedDate);

  const changeWeek = (offset) => {
    const current = new Date(weekStart);
    current.setDate(current.getDate() + offset * 7);
    const newStart = current.toISOString().split("T")[0];
    setWeekStart(newStart);
    setSelectedDate(newStart);
  };

  const buildReminderLink = (schedule) => {
    if (!schedule?.tanggal || !schedule?.jam_mulai) return "#";
    const start = new Date(`${schedule.tanggal}T${schedule.jam_mulai}`);
    const end = new Date(`${schedule.tanggal}T${schedule.jam_selesai || schedule.jam_mulai}`);
    const fmt = (d) =>
      d
        .toISOString()
        .replace(/[-:]/g, "")
        .split(".")[0] + "Z";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Shift ${schedule.shift || ""}`.trim(),
      dates: `${fmt(start)}/${fmt(end)}`,
      details: "Pengingat shift SMPJ",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Jadwal Saya</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total jadwal saya: <span className="font-semibold text-primary">{filteredSchedules.length}</span>
          </p>
        </div>
        <div className="w-full sm:w-1/3">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide">Cari Jadwal</Label>
            <div className="relative flex items-center">
              <Input
                placeholder="Cari tanggal / shift..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
              <i className="fa-solid fa-magnifying-glass text-muted-foreground absolute right-3"></i>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              className="ds-btn ds-btn-ghost text-sm"
              onClick={() => changeWeek(-1)}
              aria-label="Pekan sebelumnya"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
            <p className="text-sm font-semibold">
              Pekan {new Date(weekStart).toLocaleDateString("id-ID", { day: "numeric", month: "long" })} -
              {" "}
              {new Date(weekDays[6].date).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
            </p>
            <button
              className="ds-btn ds-btn-ghost text-sm"
              onClick={() => changeWeek(1)}
              aria-label="Pekan selanjutnya"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center">
            {weekDays.map((day) => {
              const hasShift = schedules.some((s) => s.tanggal === day.date);
              const isActive = selectedDate === day.date;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={`rounded-2xl px-2 py-3 text-xs flex flex-col gap-1 items-center border ${
                    isActive ? "bg-primary text-white" : "bg-white text-gray-700"
                  }`}
                >
                  <span className="font-semibold">{day.label}</span>
                  <span className="text-lg font-bold">{day.day}</span>
                  {hasShift && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                </button>
              );
            })}
          </div>
          <div className="text-right">
            <a
              href={buildReminderLink(selectedSchedule)}
              target="_blank"
              rel="noopener noreferrer"
              className={`ds-btn ${!selectedSchedule ? "pointer-events-none opacity-50" : ""}`}
            >
              <i className="fa-solid fa-bell mr-2" /> Jadwalkan Pengingat
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Shift</Label>
            <Select
              value={shiftFilter}
              onChange={(e) => {
                setShiftFilter(e.target.value);
                fetchSchedule(selectedDate, mode, e.target.value);
              }}
            >
              {SHIFTS.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Filter Tanggal</Label>
            <Select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                fetchSchedule(selectedDate, e.target.value, shiftFilter);
              }}
            >
              {FILTER_MODES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{mode === "month" ? "Bulan" : "Tanggal"}</Label>
            <Input
              type={mode === "month" ? "month" : "date"}
              value={mode === "month" ? selectedDate?.slice(0, 7) : selectedDate}
              onChange={(e) => {
                const value = mode === "month" ? `${e.target.value}-01` : e.target.value;
                setSelectedDate(value);
                fetchSchedule(value, mode, shiftFilter);
              }}
            />
          </div>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="py-6 text-center text-muted-foreground">Memuat jadwal...</div>
          ) : weekSchedules.length > 0 ? (
            weekSchedules.map((s, i) => (
              <div key={`${s.id || i}`} className="py-4">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="align-middle">
                      <td className="font-semibold text-primary w-1/3">
                        {s.tanggal
                          ? new Date(s.tanggal).toLocaleDateString("id-ID", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })
                          : "-"}
                      </td>
                      <td className="text-center w-1/3">
                        <span className={`px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${shiftClass(s.shift)}`}>
                          {s.shift || "Tanpa shift"}
                        </span>
                      </td>
                      <td className="text-right w-1/3">
                        <span className="ds-badge bg-[hsl(var(--muted))] text-[11px] tracking-wide">
                          ID #{s.id || "-"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="text-center text-muted-foreground pt-3">
                        Jam {s.jam_mulai || "--"} – {s.jam_selesai || "--"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <div className="text-gray-400 py-6 text-center">
              Tidak ada jadwal untuk kriteria yang dipilih.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
