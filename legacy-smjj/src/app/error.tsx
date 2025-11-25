"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SMJJ error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-3xl rounded-[36px] border border-white/10 bg-white/5 p-8 shadow-[0_35px_120px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="rounded-3xl bg-white/10 p-6 text-center lg:w-2/5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-200">
              <TriangleAlert size={42} />
            </div>
            <p className="mt-4 text-sm uppercase tracking-[0.4em] text-rose-200">
              SMJJ Notice
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Ada yang tidak beres
            </h1>
            <p className="mt-3 text-sm text-white/70">
              Sistem Manajemen Jambar Jabu mendeteksi error saat memuat data. Tim kami
              otomatis mendapat log untuk ditindaklanjuti.
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-between rounded-3xl border border-white/10 bg-white/10 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/60">
                Rincian
              </p>
              <p className="mt-3 text-lg text-white">
                {error?.message || "Terjadi kegagalan tak terduga."}
              </p>
              {error?.digest && (
                <p className="mt-2 text-xs text-white/50">
                  Kode insiden: {error.digest}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={reset}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:translate-y-0.5"
              >
                <RefreshCw size={18} />
                Muat ulang modul
              </button>
              <Link
                href="/dashboard"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                <Home size={18} />
                Kembali ke dashboard
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          SMJJ • Sistem Manajemen Jambar Jabu — menjaga operasional tetap stabil
        </p>
      </div>
    </div>
  );
}
