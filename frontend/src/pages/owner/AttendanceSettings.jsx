import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import api from "../../services/api";
import { toast } from "../../components/ui/toast";
import LocationMapPicker from "../../components/owner/LocationMapPicker";

const DEFAULT_LAT = "-7.779071";
const DEFAULT_LNG = "110.416098";

const defaultSettings = {
  buffer_before_start: "30",
  buffer_after_end: "30",
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  radius_m: "100",
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

export default function AttendanceSettings() {
  const [settings, setSettings] = React.useState(defaultSettings);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [geoLoading, setGeoLoading] = React.useState(false);

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

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        buffer_before_start: parseNumber(settings.buffer_before_start, 0),
        buffer_after_end: parseNumber(settings.buffer_after_end, 0),
        latitude: parseNumber(settings.latitude, Number(DEFAULT_LAT)),
        longitude: parseNumber(settings.longitude, Number(DEFAULT_LNG)),
        radius_m: parseNumber(settings.radius_m, 100),
      };
      const res = await api.put("/owner/settings", payload);
      toast.success(res?.data?.message || "Pengaturan berhasil disimpan.");
      setSettings((prev) => ({ ...prev, ...normalizePayload(res?.data?.data || payload) }));
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.message || "Gagal menyimpan pengaturan absensi.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const radiusValue = parseNumber(settings.radius_m, 0);
  const radiusInfo =
    radiusValue > 0
      ? `Radius aman ${radiusValue} m dari titik kantor.`
      : "Batas lokasi dimatikan - semua koordinat diterima.";

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
      latitude: coords.lat.toFixed(6),
      longitude: coords.lng.toFixed(6),
    }));
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
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Menu Owner</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-primary">Pengaturan Absensi</h1>
          <p className="text-sm text-muted-foreground">
            Atur buffer check-in/out dan batas lokasi agar seluruh pegawai mengikuti aturan yang sama.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={loadSettings} disabled={loading || saving}>
            <i className="fa-solid fa-rotate-right mr-2" />
            Refresh
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
                  min={0}
                  max={240}
                  step={5}
                  value={settings.buffer_before_start}
                  onChange={handleChange("buffer_before_start")}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Pegawai hanya bisa check-in setelah {parseNumber(settings.buffer_before_start, 0)} menit sebelum jadwal dimulai.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer_after_end">Batas waktu check-out setelah jam selesai</Label>
                <Input
                  id="buffer_after_end"
                  type="number"
                  min={0}
                  max={240}
                  step={5}
                  value={settings.buffer_after_end}
                  onChange={handleChange("buffer_after_end")}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Check-out tetap tersedia hingga {parseNumber(settings.buffer_after_end, 0)} menit setelah jam selesai.
                </p>
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
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius_m">Radius Aman (meter)</Label>
              <Input
                id="radius_m"
                type="number"
                min={50}
                max={2000}
                step={10}
                value={settings.radius_m}
                onChange={handleChange("radius_m")}
                required
              />
              <p className="text-xs text-muted-foreground">{radiusInfo}</p>
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
    </div>
  );
}
