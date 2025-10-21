import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Table, TBody, THead, TH, TR, TD } from '../../components/ui/table'
import { Select, Label, Input } from '../../components/ui/input'
import api from '../../lib/api'
import { toast } from '../../components/ui/toast'

export default function Attendance() {
  const [employees, setEmployees] = React.useState([])
  const [employeeId, setEmployeeId] = React.useState('')
  const [from, setFrom] = React.useState(() => new Date(Date.now()-6*86400000).toISOString().slice(0,10))
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0,10))
  const [rows, setRows] = React.useState([])

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
      const res = await api.get('attendance', { params: { employee_id: employeeId || undefined } })
      const all = Array.isArray(res.data) ? res.data : []
      setRows(all.filter(a => a.tanggal >= from && a.tanggal <= to))
    } catch {
      toast.error('Gagal memuat absensi')
    }
  }

  React.useEffect(()=>{ if(employeeId) load() }, [employeeId, from, to])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Absensi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div><Label>Dari</Label><Input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div>
            <div><Label>Sampai</Label><Input type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>
            <div className="sm:col-span-2">
              <Label>Pegawai</Label>
              <Select value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.nama}</option>)}
              </Select>
            </div>
          </div>

          <Table>
            <THead>
              <TR><TH>Tanggal</TH><TH>Masuk</TH><TH>Pulang</TH><TH>Status</TH></TR>
            </THead>
            <TBody>
              {rows.map((r, i)=>(
                <TR key={i}>
                  <TD>{r.tanggal}</TD>
                  <TD>{r.check_in || '-'}</TD>
                  <TD>{r.check_out || '-'}</TD>
                  <TD>
                    <span className={
                      r.status === 'Hadir'
                        ? 'ds-badge bg-[hsl(var(--success))] text-[hsl(var(--primary-foreground))]'
                        : 'ds-badge bg-[hsl(var(--muted))]'
                    }>
                      {r.status || '-'}
                    </span>
                  </TD>
                </TR>
              ))}
              {rows.length===0 && <TR><TD colSpan={4} className="py-6 text-center text-[hsl(var(--muted-foreground))]">Belum ada data</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
