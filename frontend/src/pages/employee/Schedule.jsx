import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Select, Label, Input } from '../../components/ui/input'
import api from '../../lib/api'
import { toast } from '../../components/ui/toast'

const fmtDate = (d) => d.toISOString().slice(0,10)

export default function Schedule() {
  const [employees, setEmployees] = React.useState([])
  const [employeeId, setEmployeeId] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState(() => {
    const d = new Date(); d.setDate(d.getDate()-3); return fmtDate(d)
  })
  const [dateTo, setDateTo] = React.useState(() => fmtDate(new Date()))
  const [schedules, setSchedules] = React.useState([])

  React.useEffect(()=> {
    (async () => {
      try {
        const res = await api.get('employees')
        setEmployees(res.data || [])
        if((res.data||[]).length) setEmployeeId(res.data[0].id)
      } catch {}
    })()
  }, [])

  const load = async () => {
    try {
      const res = await api.get('schedules')
      const all = res.data || []
      const filtered = all
        .filter(s => (!employeeId || s.employee_id === employeeId))
        .filter(s => (!dateFrom || s.tanggal >= dateFrom) && (!dateTo || s.tanggal <= dateTo))
        .sort((a,b)=> a.tanggal < b.tanggal ? -1 : 1)
      setSchedules(filtered)
    } catch {
      toast.error('Gagal memuat jadwal')
    }
  }

  React.useEffect(()=>{ load() }, [employeeId, dateFrom, dateTo])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Jadwal Saya</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div><Label>Dari</Label><Input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} /></div>
            <div><Label>Sampai</Label><Input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} /></div>
            <div className="sm:col-span-2">
              <Label>Pegawai</Label>
              <Select value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.nama}</option>)}
              </Select>
            </div>
          </div>

          <div className="divide-y divide-[hsl(var(--muted))]">
            {schedules.map(s => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.tanggal} • {s.shift}</div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">Jam {s.jam_mulai}–{s.jam_selesai}</div>
                </div>
                <div className="ds-badge bg-[hsl(var(--muted))]">Shift</div>
              </div>
            ))}
            {schedules.length === 0 && (
              <div className="text-[hsl(var(--muted-foreground))] py-6">Tidak ada jadwal</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
