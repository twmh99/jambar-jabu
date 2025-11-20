export default function DownloadButton({
  filename = 'export.csv',
  rows = [],
  headers = [],
  className = '',
}) {
  const toCSV = () => {
    const head = headers.length ? headers : Object.keys(rows[0] || {})
    const csv = [head.join(','), ...rows.map(r => head.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={toCSV} className={['ds-btn ds-btn-outline', className].join(' ').trim()}>
      <i className="fa-solid fa-download mr-2" /> Download CSV
    </button>
  )
}
