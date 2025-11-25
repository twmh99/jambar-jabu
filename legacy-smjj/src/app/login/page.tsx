"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { BadgeCheck, Layers3, Lock, Mail, Sparkles, Workflow } from "lucide-react";

const errorMessages: Record<string, string> = {
  email_empty: "Email wajib diisi.",
  email_invalid: "Email tidak ditemukan.",
  password_empty: "Password wajib diisi.",
  password_invalid: "Password tidak sesuai.",
  rate: "Terlalu banyak percobaan. Coba lagi beberapa menit.",
};

export default function LoginPage() {
  const [role, setRole] = useState<"OWNER" | "PEGAWAI">("PEGAWAI");
  const year = useMemo(() => new Date().getFullYear(), []);
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error");
  const errorMsg = errorKey ? errorMessages[errorKey] : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-rose-500/30 blur-[160px]" />
        <div className="absolute bottom-10 right-[-6%] h-[420px] w-[420px] rounded-full bg-indigo-500/30 blur-[180px]" />
      </div>

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden flex-col justify-between px-12 py-14 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-6 py-2 text-sm font-semibold shadow-lg shadow-black/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              SMJJ • Sistem Manajemen Jambar Jabu
            </div>
            <h1 className="mt-7 text-4xl font-bold leading-snug">
              Kontrol penuh operasional Pelanggan, Menu, Riwayat, dan reward pelanggan di satu panel modern.
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/70">
              SMJJ dirancang khusus untuk Jambar Jabu agar bisa mengelola CRM 
            </p>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur lg:grid-cols-3">
            {[
              { title: "SMJJ Insight", desc: "Dashboard Total Pelanggan, Riwayat Kunjungan, Total Penjualan", Icon: Sparkles },
              { title: "Workflow Otomatis", desc: "Approval Riwayat realtime", Icon: Workflow },
              { title: "Keamanan Berlapis", desc: "Akses dibatasi per-role", Icon: BadgeCheck },
            ].map(({ title, desc, Icon }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="inline-flex w-fit rounded-2xl bg-white/15 p-2">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-lg font-semibold">{title}</p>
                <p className="text-sm text-white/70">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <div className="relative h-28 w-28 rounded-3xl border border-white/10 bg-white/10 p-4">
              <Image src="/logo-jj.png" alt="Logo Jambar Jabu" fill className="object-contain" sizes="112px" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Powered By</p>
              <p className="text-2xl font-semibold">SMJJ • Sistem Manajemen Jambar Jabu</p>
              <p className="text-sm text-white/70">
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white px-6 py-12 sm:px-12">
          <form
            action="/api/login"
            method="post"
            className="w-full max-w-md rounded-[32px] border border-slate-100 bg-white/80 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.12)] backdrop-blur"
          >
            <div className="mb-6 text-center">
              <span className="inline-flex rounded-full bg-indigo-100 px-4 py-1 text-xs font-semibold text-indigo-600">
                Selamat datang kembali
              </span>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900">Masuk ke akun Anda</h2>
              <p className="mt-2 text-sm text-slate-500">
                Gunakan kredensial resmi untuk mengakses dasbor operasional
              </p>
            </div>

            <input type="hidden" name="role" value={role} />
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Masuk sebagai</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {[
                { label: "Owner", value: "OWNER" as const, helper: "Akses penuh" },
                { label: "Pegawai", value: "PEGAWAI" as const, helper: "Operasional lapangan" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    role === option.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <p className="font-semibold">{option.label}</p>
                  <p className="text-xs text-slate-400">{option.helper}</p>
                </button>
              ))}
            </div>

            <label className="mt-6 block text-sm font-medium text-slate-600" htmlFor="email">
              Email
            </label>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-200">
              <Mail className="h-5 w-5 text-slate-400" />
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Masukan email"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            {errorKey && (errorKey === "email_empty" || errorKey === "email_invalid") && (
              <p className="mt-1 text-xs text-rose-500">{	errorMsg}</p>
            )}

            <label className="mt-5 block text-sm font-medium text-slate-600" htmlFor="password">
              Password
            </label>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-200">
              <Lock className="h-5 w-5 text-slate-400" />
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Masukkan password"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            {errorKey && (errorKey === "password_empty" || errorKey === "password_invalid") && (
              <p className="mt-1 text-xs text-rose-500">{	errorMsg}</p>
            )}

            {errorKey === "rate" && (
              <p className="mt-3 text-xs text-amber-600">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="mt-8 w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-200 transition hover:translate-y-0.5"
            >
              Masuk
            </button>

            <div className="mt-8 flex flex-col gap-2 text-center text-xs text-slate-400">
              <p>© {year} SMJJ — Sistem Manajemen Jambar Jabu</p>
              <p className="text-[11px]">
                Versi internal untuk monitoring kinerja, jadwal, dan loyalitas pelanggan.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
