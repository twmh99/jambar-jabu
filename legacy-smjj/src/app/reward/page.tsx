import Shell from "@/components/Shell";
import { requireRole } from "@/lib/session";
import { query } from "@/lib/db";
import RewardPresetCard from "@/components/RewardPresetCard";
import RewardDeleteButton from "@/components/RewardDeleteButton";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type RewardSearchParams = {
  customer_id?: string;
  type?: string;
  points?: string;
  note?: string;
  preset?: string;
};

export default async function RewardPage(props: {
  searchParams: Promise<RewardSearchParams & { page?: string }>;
}) {
  const { searchParams } = props;
  const sp = await searchParams;
  const keyword = sp?.q ? `%${sp.q}%` : "%%";

  const can = await requireRole(["OWNER", "PEGAWAI"]);
  if (!can.ok) redirect("/login");

  const perPage = 12;
  const pageParam = Number(sp?.page ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * perPage;

  const [txResult, countResult] = await Promise.all([
    query(
      `
      SELECT r.*, c.name as customer_name
      FROM rewards r
      JOIN customers c ON c.id = r.customer_id
      WHERE c.name ILIKE $1 OR COALESCE(r.note,'') ILIKE $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [keyword, perPage, offset]
    ),
    query(
      `
      SELECT COUNT(*)::int as total
      FROM rewards r
      JOIN customers c ON c.id = r.customer_id
      WHERE c.name ILIKE $1 OR COALESCE(r.note,'') ILIKE $1
    `,
      [keyword]
    ),
  ]);

  const txs = txResult.rows;
  const totalRows = countResult.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
  const startEntry = totalRows === 0 ? 0 : (page - 1) * perPage + 1;
  const endEntry = Math.min(page * perPage, totalRows);

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (sp?.q) params.set("q", sp.q);
    if (sp?.customer_id) params.set("customer_id", sp.customer_id);
    if (sp?.type) params.set("type", sp.type);
    if (sp?.points) params.set("points", sp.points);
    if (sp?.note) params.set("note", sp.note);
    if (sp?.preset) params.set("preset", sp.preset);
    if (targetPage > 1) params.set("page", String(targetPage));
    const suffix = params.toString();
    return suffix ? `/reward?${suffix}` : "/reward";
  };

  const presetList = [
    {
      key: "free_meal",
      label: "Makan Gratis",
      points: "50",
      note: "Tukar untuk makan gratis",
    },
    {
      key: "voucher",
      label: "Voucher Diskon",
      points: "30",
      note: "Tukar voucher diskon",
    },
  ];

  const prefCustomerId = sp?.customer_id || "";

  return (
    <Shell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Poin Reward</h1>
        <form method="get" className="flex gap-2">
          <input
            type="text"
            name="q"
            placeholder="Cari pelanggan / catatan..."
            defaultValue={sp?.q || ""}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm shadow-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
          <button
            type="submit"
            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            Cari
          </button>
        </form>
      </div>

      {prefCustomerId ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {presetList.map((preset) => (
            <RewardPresetCard
              key={preset.key}
              preset={{
                ...preset,
                customerId: prefCustomerId,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-dashed border-rose-200 bg-white/80 p-6 text-sm text-gray-600">
          Pilih pelanggan dari halaman pelanggan lalu klik tombol
          <span className="mx-1 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-semibold text-white">
            Tukar
          </span>
          untuk membuka paket redeem di sini.
        </div>
      )}

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
            <h3 className="text-lg font-bold text-gray-900">Poin Reward</h3>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="table-playful">
            <thead>
              <tr>
                <th className="text-left">Tanggal</th>
                <th className="text-left">Pelanggan</th>
                <th className="text-left">Tipe</th>
                <th className="text-right">Poin</th>
                <th>Catatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t: any) => (
                <tr key={t.id}>
                  <td className="font-semibold text-gray-900">
                    {new Date(t.created_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <div className="font-semibold text-gray-900">
                      {t.customer_name}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      #{t.customer_id}
                    </p>
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        t.type === "EARN"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {t.type === "EARN" ? "Tambah" : "Redeem"}
                    </span>
                  </td>
                  <td className="text-right font-semibold text-rose-600">
                    {t.type === "EARN" ? "+" : "-"}
                    {t.points} pts
                  </td>
                  <td className="text-gray-600">{t.note || "-"}</td>
                  <td>
                    <RewardDeleteButton rewardId={t.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/80 px-6 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Menampilkan {startEntry}&ndash;{endEntry} dari {totalRows} transaksi
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
