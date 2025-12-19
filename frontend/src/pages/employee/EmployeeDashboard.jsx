import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "../../components/ui/toast";
import WorkProgress from "../../components/employee/WorkProgress";
import HistoryList from "../../components/employee/HistoryList";
import api from "../../services/api";

const fmtDate = (d = new Date()) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const MAX_PROOF_SIZE = 2 * 1024 * 1024; // 2 MB

const defaultAttendanceRules = {
  buffer_before_start: 30,
  buffer_after_end: 30,
  latitude: -7.779071,
  longitude: 110.416098,
  radius_m: 100,
  requires_geofence: true,
};

const parseSettingNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseScheduleDateTime = (dateStr, timeStr = "00:00:00") => {
  if (!dateStr || !timeStr) return null;
  const [hour = "00", minute = "00", second = "00"] = timeStr.split(":");
  const date = new Date(dateStr);
  date.setHours(Number(hour), Number(minute), Number(second));
  return date;
};

const distanceInMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
const toArray = (res) => {
  if (!res) return [];
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export default function EmployeeDashboard() {
  const user = JSON.parse(localStorage.getItem("smpj_user") || "{}");
  const pegawaiId = user?.pegawai_id || user?.pegawai?.id || user?.id;

  const [time, setTime] = React.useState(new Date());
  const [todaySchedule, setTodaySchedule] = React.useState(null);
  const [weekSummary, setWeekSummary] = React.useState({ hours: 0, days: 0, tips: 0, target: 40 });
  const [history, setHistory] = React.useState([]);
  const [todayAttendance, setTodayAttendance] = React.useState(null);
  const [attendanceRules, setAttendanceRules] = React.useState(defaultAttendanceRules);
  const [geoStatus, setGeoStatus] = React.useState({
    allowed: false,
    checking: false,
    distance: null,
    message: "",
    coords: null,
  });
  const [pullHint, setPullHint] = React.useState(0);
  const pullHintRef = React.useRef(0);
  const isRefreshing = React.useRef(false);
  const [checkInPhoto, setCheckInPhoto] = React.useState(null);
  const [checkInPhotoPreview, setCheckInPhotoPreview] = React.useState("");
  const [photoError, setPhotoError] = React.useState("");
  const photoInputRef = React.useRef(null);

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      try {
        const res = await api.get("/settings/attendance");
        if (cancelled) return;
        const payload = res?.data || {};
        setAttendanceRules({
          buffer_before_start: parseSettingNumber(
            payload.buffer_before_start,
            defaultAttendanceRules.buffer_before_start
          ),
          buffer_after_end: parseSettingNumber(
            payload.buffer_after_end,
            defaultAttendanceRules.buffer_after_end
          ),
          latitude: parseSettingNumber(payload.latitude, defaultAttendanceRules.latitude),
          longitude: parseSettingNumber(payload.longitude, defaultAttendanceRules.longitude),
          radius_m: parseSettingNumber(payload.radius_m, defaultAttendanceRules.radius_m),
          requires_geofence:
            typeof payload.requires_geofence === "boolean"
              ? payload.requires_geofence
              : defaultAttendanceRules.requires_geofence,
        });
      } catch (err) {
        console.warn("Gagal memuat pengaturan absensi dinamis.", err);
      }
    };
    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = React.useCallback(async () => {
    if (!pegawaiId) return;

    try {
      const today = fmtDate();
      const [schRes, attRes] = await Promise.all([
        api.get(`/pegawai/jadwal/${pegawaiId}`, {
          params: { jenis: "day", tanggal: today },
        }),
        api.get(`/pegawai/absensi/${pegawaiId}`),
      ]);

      const schedules = toArray(schRes);
      const attendances = toArray(attRes);

      const scToday = schedules.find((s) => s.tanggal === today) || schedules[0] || null;
      setTodaySchedule(scToday || null);
      const attendanceToday = attendances.find((a) => a.tanggal === today) || null;
      setTodayAttendance(attendanceToday);

      const weekStart = (() => {
        const d = new Date();
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - (day - 1));
        return fmtDate(d);
      })();

      const parseHMS = (s) => {
        if (!s) return null;
        const [H, M, S] = s.split(":").map((n) => parseInt(n, 10));
        return H * 3600 + M * 60 + (S || 0);
      };

      const weekRows = attendances.filter((r) => r.tanggal >= weekStart);
      const workedDays = new Set(weekRows.map((r) => r.tanggal)).size;
      const hours = weekRows.reduce((acc, r) => {
        const tin = parseHMS(r.jam_masuk || r.check_in);
        const toutRaw = parseHMS(r.jam_keluar || r.check_out);
        if (Number.isFinite(tin) && Number.isFinite(toutRaw)) {
          let tout = toutRaw;
          if (tout < tin) {
            // Handle shifts that end after midnight.
            tout += 24 * 3600;
          }
          if (tout > tin) acc += (tout - tin) / 3600;
        }
        return acc;
      }, 0);
      const tipSum = weekRows.reduce((acc, r) => acc + Number(r.tip || 0), 0);
      setWeekSummary({
        hours: Math.round(hours * 100) / 100,
        days: workedDays,
        tips: Math.round(tipSum),
        target: 40,
      });

      const last7 = attendances
        .slice()
        .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
        .slice(0, 7)
        .map((r) => ({
          tanggal: r.tanggal,
          status: r.status || "-",
          jam_masuk: r.jam_masuk || r.check_in || null,
          jam_keluar: r.jam_keluar || r.check_out || null,
        }));
      setHistory(last7);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data dashboard pegawai");
    }
  }, [pegawaiId]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const startY = { current: null };
    const threshold = 80;

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      } else {
        startY.current = null;
      }
      setPullHint(0);
    };

    const handleTouchMove = (e) => {
      if (startY.current !== null) {
        const dist = e.touches[0].clientY - startY.current;
        if (dist > 0) {
          const next = Math.min(dist, 120);
          pullHintRef.current = next;
          setPullHint(next);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullHintRef.current > threshold && !isRefreshing.current) {
        isRefreshing.current = true;
        navigator.vibrate?.(30);
        await load();
        toast.info("Data diperbarui");
        isRefreshing.current = false;
      }
      pullHintRef.current = 0;
      setPullHint(0);
      startY.current = null;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [load]);

  const officeCoords = React.useMemo(
    () => ({
      lat: attendanceRules.latitude ?? defaultAttendanceRules.latitude,
      lng: attendanceRules.longitude ?? defaultAttendanceRules.longitude,
    }),
    [attendanceRules.latitude, attendanceRules.longitude]
  );
  const allowedRadius = attendanceRules.radius_m ?? defaultAttendanceRules.radius_m;

  React.useEffect(() => {
    if (!todaySchedule) {
      setGeoStatus((prev) => ({ ...prev, allowed: false, message: "", distance: null, coords: null }));
      return;
    }

    if (!attendanceRules.requires_geofence) {
      setGeoStatus({
        allowed: true,
        checking: false,
        distance: null,
        message: "",
        coords: null,
      });
      return;
    }

    if (!navigator?.geolocation) {
      setGeoStatus({
        allowed: false,
        checking: false,
        distance: null,
        message: "Perangkat tidak mendukung lokasi.",
        coords: null,
      });
      return;
    }

    setGeoStatus((prev) => ({ ...prev, checking: true, message: "" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = distanceInMeters(pos.coords.latitude, pos.coords.longitude, officeCoords.lat, officeCoords.lng);
        const rounded = Math.round(dist);
        setGeoStatus({
          allowed: dist <= allowedRadius,
          checking: false,
          distance: rounded,
          message:
            dist <= allowedRadius
              ? ""
              : `Anda berada ${rounded} m dari lokasi kantor (batas ${allowedRadius} m).`,
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      },
      (err) => {
        setGeoStatus({
          allowed: false,
          checking: false,
          distance: null,
          message: err?.message || "Izin lokasi ditolak.",
          coords: null,
        });
      },
      { enableHighAccuracy: true }
    );
  }, [
    todaySchedule?.id,
    officeCoords.lat,
    officeCoords.lng,
    allowedRadius,
    attendanceRules.requires_geofence,
  ]);

  const weeklyHours = weekSummary.hours || 0;
  const weeklyDays = weekSummary.days || 0;

  const now = time;
  const scheduleStart = todaySchedule
    ? parseScheduleDateTime(todaySchedule.tanggal, todaySchedule.jam_mulai)
    : null;
  const scheduleEnd = todaySchedule
    ? parseScheduleDateTime(todaySchedule.tanggal, todaySchedule.jam_selesai || todaySchedule.jam_mulai)
    : null;
  const bufferBeforeMs = (attendanceRules.buffer_before_start || 0) * 60 * 1000;
  const bufferAfterMs = (attendanceRules.buffer_after_end || 0) * 60 * 1000;
  const checkInWindowStart = scheduleStart ? new Date(scheduleStart.getTime() - bufferBeforeMs) : null;
  const checkInDeadline = scheduleEnd ? new Date(scheduleEnd.getTime() + bufferAfterMs) : null;
  const beforeWindow = checkInWindowStart ? now < checkInWindowStart : true;
  const afterWindow = checkInDeadline ? now > checkInDeadline : false;

  const alreadyCheckedIn = Boolean(todayAttendance?.check_in);
  const alreadyCheckedOut = Boolean(todayAttendance?.check_out);

  const canCheckIn =
    Boolean(
      todaySchedule &&
        scheduleStart &&
        scheduleEnd &&
        !alreadyCheckedIn &&
        geoStatus.allowed &&
        !geoStatus.checking &&
        now >= (checkInWindowStart || scheduleStart) &&
        !afterWindow
    );

  const checkInMessage = (() => {
    if (!todaySchedule) return "";
    if (alreadyCheckedIn) return "Anda sudah check-in hari ini.";
    if (geoStatus.checking) return "Menunggu konfirmasi lokasi...";
    if (!geoStatus.allowed) {
      return geoStatus.message || `Check-in hanya bisa dilakukan di area kantor (radius ${allowedRadius} m).`;
    }
    if (afterWindow) {
      return "Check-in shift ini sudah ditutup.";
    }
    if (beforeWindow) {
      if (!checkInWindowStart) return "Menunggu jadwal dimulai.";
      const diffMinutes = Math.max(0, Math.ceil((checkInWindowStart.getTime() - now.getTime()) / 60000));
      return `Check-in dibuka ${diffMinutes === 0 ? "sebentar lagi" : `dalam ${diffMinutes} menit`}.`;
    }
    return "";
  })();

  const checkOutDeadline = scheduleEnd ? new Date(scheduleEnd.getTime() + bufferAfterMs) : null;
  const checkOutExpired = checkOutDeadline ? now > checkOutDeadline : false;
  const showCheckOut = Boolean(
    todaySchedule && scheduleEnd && alreadyCheckedIn && now >= scheduleEnd && !checkOutExpired
  );
  const canCheckOut = Boolean(
    showCheckOut && !alreadyCheckedOut && geoStatus.allowed && !geoStatus.checking
  );
  const checkOutMessage = (() => {
    if (!todaySchedule) return "";
    if (checkOutExpired) return "Batas check-out sudah berakhir.";
    if (!showCheckOut) return "Check-out akan tersedia setelah jam selesai.";
    if (alreadyCheckedOut) return "Anda sudah check-out hari ini.";
    if (geoStatus.checking) return "Menunggu konfirmasi lokasi...";
    if (!geoStatus.allowed) {
      return geoStatus.message || `Check-out hanya bisa dilakukan di area kantor (radius ${allowedRadius} m).`;
    }
    return "";
  })();

  const nextShiftSoon =
    scheduleStart &&
    scheduleStart.getTime() - now.getTime() > 0 &&
    scheduleStart.getTime() - now.getTime() <= 60 * 60 * 1000;

  React.useEffect(() => {
    const key = "smpj_nav_alert";
    if (nextShiftSoon) {
      localStorage.setItem(key, "/employee/schedule");
    } else {
      localStorage.removeItem(key);
    }
    window.dispatchEvent(new Event("smpj-nav-alert"));
    return () => window.dispatchEvent(new Event("smpj-nav-alert"));
  }, [nextShiftSoon]);

  const onCheckIn = async () => {
    if (!canCheckIn) {
      toast.error(checkInMessage || "Check-in tidak sesuai jadwal.");
      return;
    }
    if (photoError) {
      toast.error("Perbaiki bukti foto sebelum check-in.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("pegawai_id", pegawaiId);
      if (geoStatus.coords?.lat) formData.append("latitude", geoStatus.coords.lat);
      if (geoStatus.coords?.lng) formData.append("longitude", geoStatus.coords.lng);
      if (checkInPhoto) {
        formData.append("bukti_foto", checkInPhoto);
      }
      await api.post(`/pegawai/checkin`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Check-in berhasil!");
      setCheckInPhoto(null);
      setCheckInPhotoPreview("");
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
      load();
    } catch (error) {
      console.error(error);
      const message = error?.response?.data?.message || "Check-in gagal";
      toast.error(message);
    }
  };

  const onCheckOut = async () => {
    if (!canCheckOut) {
      toast.error(checkOutMessage || "Check-out belum dapat dilakukan.");
      return;
    }
    try {
      await api.post(`/pegawai/checkout`, {
        pegawai_id: pegawaiId,
        latitude: geoStatus.coords?.lat,
        longitude: geoStatus.coords?.lng,
      });
      toast.success("Check-out berhasil!");
      load();
    } catch (error) {
      console.error(error);
      const message = error?.response?.data?.message || "Check-out gagal";
      toast.error(message);
    }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCheckInPhoto(null);
      setCheckInPhotoPreview("");
      setPhotoError("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPhotoError("Bukti foto harus berupa gambar (JPG/PNG).");
      setCheckInPhoto(null);
      setCheckInPhotoPreview("");
      return;
    }
    if (file.size > MAX_PROOF_SIZE) {
      setPhotoError("Ukuran bukti foto maksimal 2 MB.");
      setCheckInPhoto(null);
      setCheckInPhotoPreview("");
      return;
    }
    setPhotoError("");
    setCheckInPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setCheckInPhotoPreview(reader.result?.toString() || "");
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setCheckInPhoto(null);
    setCheckInPhotoPreview("");
    setPhotoError("");
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {pullHint > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          {pullHint > 80 ? "Lepas untuk refresh" : "Tarik ke bawah untuk refresh"}
        </div>
      )}
      {/* === Header Profil === */}
      <div className="flex justify-between items-start border-b pb-2">
        <div>
          <h2 className="text-lg font-semibold">Profil Pegawai</h2>
          <p className="text-sm text-gray-500">
            ID Pegawai: {pegawaiId || "-"} | {user?.name || "Pegawai"}
          </p>
        </div>
        <div className="text-sm text-gray-500 font-mono">
          {time.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}{" "}
          | {time.toLocaleTimeString("id-ID", { hour12: false })}
        </div>
      </div>

      {/* === Quick Stats === */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-sky-600 font-semibold">Shift Minggu Ini</p>
          <p className="mt-2 text-3xl font-bold text-sky-900">{weeklyDays}</p>
          <p className="text-xs text-sky-600">hari aktif dari {weekSummary.target / 8 || 5} hari kerja</p>
        </div>
        <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-amber-600 font-semibold">Sisa Jam</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {Math.max(0, (weekSummary.target || 40) - weeklyHours).toFixed(1)}
          </p>
          <p className="text-xs text-amber-600">
            dari target {(weekSummary.target || 40).toFixed(0)} jam
          </p>
        </div>
        <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Tip Minggu Ini</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            Rp{Number(weekSummary.tips || 0).toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-emerald-600">gunakan sebagai bonus motivasi</p>
        </div>
      </div>

      {/* === Jadwal Hari Ini === */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Jadwal Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule ? (
            <div className="space-y-5 rounded-xl border bg-background/60 p-4 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Shift</p>
                  <p className="text-lg font-semibold text-primary">{todaySchedule.shift || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Jam Masuk</p>
                  <p className="text-lg font-semibold whitespace-nowrap sm:whitespace-normal">
                    {(todaySchedule.jam_mulai || "--") + " – " + (todaySchedule.jam_selesai || "--")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Lokasi</p>
                  <p className="text-lg font-semibold">Jambar Jabu</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={onCheckIn}
                    className={!canCheckIn ? "opacity-60 cursor-not-allowed" : ""}
                  >
                    <i className="fa-solid fa-right-to-bracket mr-2" /> Check-In
                  </Button>
                  {showCheckOut && (
                    <Button
                      variant="outline"
                      onClick={onCheckOut}
                      className={!canCheckOut ? "opacity-60 cursor-not-allowed" : ""}
                    >
                      <i className="fa-solid fa-right-from-bracket mr-2" /> Check-Out
                    </Button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {checkInMessage && <p>{checkInMessage}</p>}
                  {checkOutMessage && <p>{checkOutMessage}</p>}
                  {geoStatus.distance !== null && (
                    <p className="text-xs">
                      Jarak Anda ±{geoStatus.distance} m dari kantor (maks {allowedRadius} m).
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-muted/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Bukti Foto Check-in (opsional)</p>
                    <p className="text-xs text-muted-foreground">
                      Foto membantu supervisor memverifikasi lokasi atau aktivitas check-in Anda.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {checkInPhoto && (
                      <Button variant="ghost" size="sm" onClick={clearPhoto}>
                        <i className="fa-solid fa-xmark mr-1" /> Hapus
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                      <i className="fa-solid fa-camera mr-2" /> Pilih Foto
                    </Button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </div>
                </div>
                {photoError ? (
                  <p className="mt-3 text-xs text-red-500 flex items-center gap-1">
                    <i className="fa-solid fa-circle-exclamation" /> {photoError}
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Format JPG/PNG dengan ukuran maksimal 2 MB.
                  </p>
                )}
                {checkInPhotoPreview && (
                  <div className="mt-3">
                    <img
                      src={checkInPhotoPreview}
                      alt="Preview bukti foto"
                      className="h-40 w-full rounded-lg border object-cover"
                    />
                    <p className="mt-2 text-xs text-muted-foreground break-all">{checkInPhoto?.name}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              Tidak ada jadwal hari ini.
            </div>
          )}
        </CardContent>
      </Card>

      {/* === Jam Kerja Minggu Ini === */}
      <Card>
        <CardHeader>
          <CardTitle>Jam Kerja Minggu Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkProgress hours={weeklyHours} target={40} daysWorked={weeklyDays} daysTarget={6} />
        </CardContent>
      </Card>

      {/* === Riwayat 7 Hari === */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat 7 Hari</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryList items={history} />
        </CardContent>
      </Card>
    </div>
  );
}
