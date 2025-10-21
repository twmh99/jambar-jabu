export default function EmptyState({ title = 'Tidak ada data', desc = 'Silakan ubah filter atau tambah data.' }) {
  return (
    <div className="text-center text-[hsl(var(--muted-foreground))] p-10">
      <div className="text-lg font-medium">{title}</div>
      <div className="text-sm mt-1">{desc}</div>
    </div>
  )
}
