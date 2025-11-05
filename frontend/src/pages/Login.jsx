import React, { useState } from "react";
import { Input, Label } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { toast } from "../components/ui/toast";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const heroImg = "https://i.pinimg.com/736x/fc/a0/bf/fca0bf9cd1188b01b9ccd16617655080.jpg";

export default function Login() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /** 🔐 SUBMIT LOGIN */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!login.trim() || !password.trim()) {
      toast.error("Isi email/nama dan password!");
      return;
    }

    try {
      setLoading(true);

      // Kompatibilitas penuh dengan backend Laravel:
      const payload = {
        login: login, // bisa nama / email
        email: login, 
        password: password,
      };

      const res = await api.post("/login", payload);

      // destruktur data dari response Laravel
      const { access_token, role, user, must_change_password } = res.data;

      // simpan ke localStorage
      localStorage.setItem("smpj_token", access_token);
      localStorage.setItem("smpj_role", role);
      localStorage.setItem("smpj_user", JSON.stringify(user));

      if (must_change_password) {
        toast.warning("Silakan ubah password Anda terlebih dahulu!");
        navigate("/employee/profile");
        return;
      }

      toast.success("Login berhasil!");

      // navigasi otomatis berdasarkan role
      switch (role) {
        case "owner":
          navigate("/owner/dashboard");
          break;
        case "supervisor":
          navigate("/supervisor/dashboard");
          break;
        case "pegawai":
        case "employee":
          navigate("/employee/dashboard");
          break;
        default:
          navigate("/employee/dashboard");
          break;
      }
    } catch (err) {
      console.error("Login error:", err);
      localStorage.removeItem("smpj_token"); // clear token lama jika error

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.login?.[0] ||
        err?.response?.data?.errors?.email?.[0] ||
        "Login gagal. Periksa email/nama & password.";

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /** 💄 UI */
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* ======== KIRI: HERO IMAGE ======== */}
      <div
        className="hidden md:block relative noise-overlay"
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(12,30,53,0.7), rgba(12,30,53,0.7))",
          }}
        />
        <div className="absolute bottom-8 left-8 right-8 text-[hsl(var(--primary-foreground))]">
          <h1 className="text-4xl sm:text-5xl font-display font-semibold leading-tight">
            SMPJ — Sistem Manajemen Pegawai & Jadwal
          </h1>
          <p className="mt-3 text-[hsl(var(--muted))] max-w-lg">
            Kelola jadwal, absensi, dan gaji pegawai Jambar Jabu secara cepat
            dan transparan.
          </p>
        </div>
      </div>

      {/* ======== KANAN: FORM LOGIN ======== */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <form
          onSubmit={handleSubmit}
          className="ds-card w-full max-w-md p-6 sm:p-8 shadow-lg rounded-xl border border-[hsl(var(--muted))]"
        >
          <h2 className="text-2xl font-semibold text-center">Masuk</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mt-1">
            Gunakan akun yang sudah terdaftar.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="login">Email atau Nama</Label>
              <Input
                id="login"
                name="login"
                type="text"
                placeholder="Masukkan Email atau Username"
                autoComplete="username"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full mt-4 ds-btn ds-btn-primary font-medium"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </div>

          <p className="text-xs text-center text-[hsl(var(--muted-foreground))] mt-6">
            © 2025 SMPJ — Jambar Jabu. All rights reserved.
          </p>
        </form>
      </div>
    </div>
  );
}
