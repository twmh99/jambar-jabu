import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";
import LocationMapPicker from "../../components/owner/LocationMapPicker";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";

const DEFAULT_LAT = "-7.779071";
const DEFAULT_LNG = "110.416098";

const defaultSettings = {
  buffer_before_start: "30",
  buffer_after_end: "30",
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  radius_m: "50",
  requires_geofence: true,
};

const normalizePayload = (payload = {}) => ({
  buffer_before_start: String(payload.buffer_before_start ?? defaultSettings.buffer_before_start),
  buffer_after_end: String(payload.buffer_after_end ?? defaultSettings.buffer_after_end),
  latitude: String(payload.latitude ?? defaultSettings.latitude ?? DEFAULT_LAT),
  longitude: String(payload.longitude ?? defaultSettings.longitude ?? DEFAULT_LNG),
  radius_m: String(payload.radius_m ?? defaultSettings.radius_m),
  requires_geofence: payload.requires_geofence ?? defaultSettings.requires_geofence,
});

const parseNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[10px] leading-none">
        !
      </span>
      {message}
    </p>
  );
};

export default function AttendanceSettings() {
  const [settings, setSettings] = React.useState(defaultSettings);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [geoLoading, setGeoLoading] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [confirmState, setConfirmState] = React.useState({ open: false, payload: null });

  const loadSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/owner/settings");
      setSettings((prev) => ({ ...prev, ...normalizePayload(res?.data) }));
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat pengaturan absensi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const validateField = React.useCallback((field, rawValue) => {
    const nextErrors = {};
    const value = parseNumber(rawValue, 0);

    if (field === "buffer_before_start") {
      if (!rawValue || value < 30 || value > 60) {
        nextErrors.buffer_before_start = "Wajib di antara 30 - 60 menit sebelum jam masuk.";
      }
    }
    if (field === "buffer_after_end") {
      if (!rawValue || value < 30) {
        nextErrors.buffer_after_end = "Minimal 30 menit setelah jam selesai.";
      }
    }
    if (field === "radius_m") {
      if (!rawValue || value < 50 || value > 100) {
        nextErrors.radius_m = "Radius harus di antara 50 - 100 meter.";
      }
    }
    if (field === "latitude") {
      if (!rawValue || value === 0) {
        nextErrors.latitude = "Latitude tidak boleh kosong.";
      }
    }
    if (field === "longitude") {
      if (!rawValue || value === 0) {
        nextErrors.longitude = "Longitude tidak boleh kosong.";
      }
    }

    return nextErrors;
  }, []);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (field === "latitude" || field === "longitude") {
        delete next.latitude;
        delete next.longitude;
      }
      const fieldErrors = validateField(field, value);
      return { ...next, ...fieldErrors };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        buffer_before_start: parseNumber(settings.buffer_before_start, 0),
        buffer_after_end: parseNumber(settings.buffer_after_end, 0),
        latitude: parseNumber(settings.latitude, Number(DEFAULT_LAT)),
        longitude: parseNumber(settings.longitude, Number(DEFAULT_LNG)),
        radius_m: parseNumber(settings.radius_m, 50),
      };
      const nextErrors = {
        ...validateField("buffer_before_start", settings.buffer_before_start),
        ...validateField("buffer_after_end", settings.buffer_after_end),
        ...validateField("latitude", settings.latitude),
        ...validateField("longitude", settings.longitude),
        ...validateField("radius_m", settings.radius_m),
      };

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        toast.error("Data tidak valid. Lengkapi seluruh input sesuai ketentuan.");
        return;
      }

      setErrors({});
      setConfirmState({ open: true, payload });
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.message || "Gagal menyimpan pengaturan absensi.";
      toast.error(message);
    }
  };

  const handleConfirmSave = async () => {
    if (!confirmState.payload) return;
    setSaving(true);
    try {
      const res = await api.put("/owner/settings", confirmState.payload);
      toast.success(res?.data?.message || "Pengaturan berhasil disimpan.");
      setSettings((prev) => ({ ...prev, ...normalizePayload(res?.data?.data || confirmState.payload) }));
      setConfirmState({ open: false, payload: null });
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.message || "Gagal menyimpan pengaturan absensi.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelConfirm = () => {
    if (saving) return;
    setConfirmState({ open: false, payload: null });
  };

  const radiusValue = parseNumber(settings.radius_m, 0);
  const isRadiusValid = radiusValue >= 50 && radiusValue <= 100;
  const radiusInfo = isRadiusValid
    ? `Radius aman ${radiusValue} m dari titik kantor.`
    : "Radius harus berada pada rentang 50 - 100 meter.";

  const mapCoords = React.useMemo(
    () => ({
      lat: parseNumber(settings.latitude, Number(DEFAULT_LAT)),
      lng: parseNumber(settings.longitude, Number(DEFAULT_LNG)),
    }),
    [settings.latitude, settings.longitude]
  );

  const handleMapChange = (coords) => {
    setSettings((prev) => ({
      ...prev,
      latitude: String(coords.lat),
      longitude: String(coords.lng),
    }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.latitude;
        delete next.longitude;
        return next;
      });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator?.geolocation) {
      toast.error("Browser tidak mendukung geolokasi otomatis.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleMapChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        toast.success("Koordinat kantor diset dari lokasi Anda saat ini.");
      },
      (err) => {
        console.error(err);
        setGeoLoading(false);
        toast.error(err?.message || "Gagal mengambil lokasi perangkat.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-primary">Pengaturan Absensi</h1>
          <p className="text-sm text-muted-foreground">
            Atur buffer check-in/out dan batas lokasi agar seluruh pegawai mengikuti aturan yang sama.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={loadSettings}
            disabled={loading || saving}
            className="whitespace-nowrap rounded-sm"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner animate-spin mr-2" /> Memuat...
              </>
            ) : (
              <>
                <i className="fa-solid fa-arrows-rotate mr-2" /> Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Buffer Waktu Check-In & Check-Out</CardTitle>
            <CardDescription>
              Tentukan kapan pintu check-in dibuka sebelum shift dimulai dan batas waktu check-out setelah shift berakhir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="buffer_before_start">Check-in dibuka sebelum jam masuk</Label>
                <Input
                  id="buffer_before_start"
                  type="number"
                  min={30}
                  max={60}
                  step={5}
                  value={settings.buffer_before_start}
                  onChange={handleChange("buffer_before_start")}
                  required
                />
                <p
                  className={`text-xs ${
                    errors.buffer_before_start ? "text-red-600" : "text-muted-foreground"
                  }`}
                >
                  Pegawai hanya bisa check-in setelah 30 - 60 menit sebelum jadwal dimulai.
                </p>
                <ErrorMessage message={errors.buffer_before_start} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer_after_end">Batas waktu check-out setelah jam selesai</Label>
                <Input
                  id="buffer_after_end"
                  type="number"
                  min={30}
                  max={240}
                  step={5}
                  value={settings.buffer_after_end}
                  onChange={handleChange("buffer_after_end")}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Check-out tetap tersedia hingga {parseNumber(settings.buffer_after_end, 0)} menit setelah jam selesai.
                </p>
                <ErrorMessage message={errors.buffer_after_end} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Koordinat Lokasi & Geofence</CardTitle>
            <CardDescription>
              Sistem akan menolak check-in / check-out jika pegawai berada di luar radius yang ditentukan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude (koordinat)</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={settings.latitude}
                  onChange={handleChange("latitude")}
                  required
                />
                <ErrorMessage message={errors.latitude} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude (koordinat)</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={settings.longitude}
                  onChange={handleChange("longitude")}
                  required
                />
                <ErrorMessage message={errors.longitude} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius_m">Radius Aman (meter)</Label>
              <Input
                id="radius_m"
                type="number"
                min={50}
                max={100}
                step={10}
                value={settings.radius_m}
                onChange={handleChange("radius_m")}
                required
              />
              <p
                className={`text-xs ${
                  errors.radius_m || !isRadiusValid ? "text-red-600" : "text-muted-foreground"
                }`}
              >
                {radiusInfo}
              </p>
              <ErrorMessage message={errors.radius_m} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pilih Lokasi pada Peta</Label>
              <LocationMapPicker value={mapCoords} radius={radiusValue} onChange={handleMapChange}>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white/90 backdrop-blur px-3 py-1 text-xs font-medium shadow-sm"
                  onClick={handleUseCurrentLocation}
                  disabled={geoLoading}
                >
                  {geoLoading ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin mr-1" /> Mengambil lokasi...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-location-crosshairs mr-1" /> Gunakan lokasi saya
                    </>
                  )}
                </Button>
              </LocationMapPicker>
              <p className="text-xs text-muted-foreground">
                Klik area restoran atau geser marker untuk memperbarui koordinat. Radius divisualisasikan dengan lingkaran
                biru.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Panduan</CardTitle>
            <CardDescription>
              Informasikan ke pegawai bahwa aturan ini berlaku untuk seluruh divisi dan otomatis diterapkan pada aplikasi
              pegawai.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              • Buffer check-in membantu mencegah antrean panjang sekaligus memastikan tidak ada absensi terlalu cepat.{" "}
            </p>
            <p>• Buffer check-out digunakan sebagai masa toleransi setelah shift selesai sebelum sistem dikunci.</p>
            <p>
              • Koordinat kantor bisa disalin langsung dari Google Maps. Pastikan radius cukup menutupi area restoran
              namun tidak terlalu luas.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || loading}>
            {saving ? (
              <>
                <i className="fa-solid fa-spinner animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk mr-2" />
                Simpan Pengaturan
              </>
            )}
          </Button>
        </div>
      </form>
      <ConfirmActionModal
        open={confirmState.open}
        loading={saving}
        title="Simpan Pengaturan Absensi"
        message="Simpan pengaturan absensi ini?"
        detail="Seluruh pegawai akan mengikuti aturan baru."
        confirmLabel="Simpan Sekarang"
        cancelLabel="Batal"
        onCancel={handleCancelConfirm}
        onConfirm={handleConfirmSave}
      />
    </div>
  );
}
