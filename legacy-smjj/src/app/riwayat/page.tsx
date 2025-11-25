import Shell from "@/components/Shell";
import { requireRole } from "@/lib/session";
import { query } from "@/lib/db";
import VisitsImportForm from "@/components/VisitsImportForm";
import { redirect } from "next/navigation";
import Link from "next/link";
import VisitDeleteButton from "@/components/VisitDeleteButton";

export const dynamic = "force-dynamic";

export default async function RiwayatPage(props: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { searchParams } = props;
  const sp = await searchParams; // �o. Next.js 16: harus di-await
  const can = await requireRole(["OWNER", "PEGAWAI"]);
  if (!can.ok) redirect("/login");

  // �o. Ambil kata kunci dari URL (?q=...)
  const keyword = sp?.q ? `%${sp.q}%` : "%%";

  // �o. Query database dengan filter nama pelanggan
  const perPage = 12;
  const pageParam = Number(sp?.page ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * perPage;

  const [visitsResult, countResult] = await Promise.all([
    query(
      `
      SELECT v.*, c.name as customer_name
      FROM visits v
      JOIN customers c ON c.id = v.customer_id
      WHERE c.name ILIKE $1
      ORDER BY visited_at DESC
      LIMIT $2 OFFSET $3
    `,
      [keyword, perPage, offset]
    ),
    query(
      `
      SELECT COUNT(*)::int as total
      FROM visits v
      JOIN customers c ON c.id = v.customer_id
      WHERE c.name ILIKE $1
    `,
      [keyword]
    ),
  ]);

  const visits = visitsResult.rows;
  const totalVisits = countResult.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalVisits / perPage));
  const startEntry = totalVisits === 0 ? 0 : (page - 1) * perPage + 1;
  const endEntry = Math.min(page * perPage, totalVisits);

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (sp?.q) params.set("q", sp.q);
    if (targetPage > 1) params.set("page", String(targetPage));
    const suffix = params.toString();
    return suffix ? `/riwayat?${suffix}` : "/riwayat";
  };

  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-4">Riwayat Kunjungan</h1>

      {/* dY"? Bar atas: Import + Cari */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        {/* dY"� Form Impor File dari POS */}
        <VisitsImportForm />

        {/* dY"? Form Pencarian (tetap) */}
        <form method="get" className="flex gap-2">
          <input
            type="text"
            name="q"
            placeholder="Cari nama pelanggan..."
            defaultValue={sp?.q || ""}
            className="border rounded p-2 w-64 text-sm"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700 text-sm"
          >
            Cari
          </button>
        </form>
      </div>

      {/* dY_ Tabel Riwayat (TIDAK diubah strukturnya) */}
      <div className="rounded-2xl bg-gradient-to-br from-white to-rose-50 shadow-lg border border-white/60 glow-panel animate-pop">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/70 bg-white/60 backdrop-blur">
          <img
            src="/logo-jj.png"
            alt="Logo JJ"
            className="h-11 w-11 rounded-full object-cover shadow animate-floaty"
            loading="lazy"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-500">
              SMJJ
            </p>
            <h3 className="text-lg font-bold text-gray-900">
              Riwayat Kunjungan
            </h3>
          </div>
        </div>
        <div className="relative overflow-auto">
          <table className="table-playful">
            <thead>
              <tr>
                <th className="text-left">Tanggal</th>
                <th className="text-left">Pelanggan</th>
                <th className="text-right">Belanja</th>
                <th className="text-right">Poin</th>
                <th className="text-center sticky right-0 bg-white/90 backdrop-blur">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v: any) => (
                <tr key={v.id}>
                  <td className="font-semibold text-gray-900">
                    {new Date(v.visited_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">
                      {v.customer_name}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      #{v.id.toString().padStart(4, "0")}
                    </p>
                  </td>
                  <td className="text-right font-semibold text-rose-600">
                    Rp {Number(v.total_spend || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 animate-badge">
                      +{v.earned_pts} pts
                    </span>
                  </td>
                  <td className="sticky right-0 bg-white/90 text-center">
                    <VisitDeleteButton visitId={v.id} />
                  </td>
                </tr>
              ))}

              {visits.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={5}>
                    Belum ada riwayat kunjungan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/80 px-6 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Menampilkan {startEntry}&ndash;{endEntry} dari {totalVisits} kunjungan
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={buildHref(page - 1)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                &lsaquo; Sebelumnya
              </Link>
            ) : (
              <span className="rounded-full border border-gray-100 px-3 py-1 text-xs font-semibold text-gray-400">
                &lsaquo; Sebelumnya
              </span>
            )}
            <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
              Halaman {page} dari {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={buildHref(page + 1)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Selanjutnya &rsaquo;
              </Link>
            ) : (
              <span className="rounded-full border border-gray-100 px-3 py-1 text-xs font-semibold text-gray-400">
                Selanjutnya &rsaquo;
              </span>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
