import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Table, TBody, THead, TH, TR, TD } from '../../components/ui/table'
import { Select, Label, Input } from '../../components/ui/input'
import api from '../../lib/api'
import { toast } from '../../components/ui/toast'

const parseHMS = s => {
  if (!s) return null
  const [H,M,S] = s.split(':').map(n=>parseInt(n,10))
  return H*3600 + M*60 + (S||0)
}

export default function Pay() {
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
      const all = (res.data || []).filter(a => a.tanggal >= from && a.tanggal <= to)
      const emp = (employees || []).find(e => e.id === employeeId)
      const rate = emp?.hourly_rate || 20000
      const lines = all.map(a => {
        const secIn = parseHMS(a.check_in), secOut = parseHMS(a.check_out)
        const hours = (secIn!=null && secOut!=null && secOut>secIn) ? (secOut-secIn)/3600 : 0
        const base = Math.round(hours * rate)
        const tips = a.tips || 0
        return { tanggal: a.tanggal, jam: hours.toFixed(2), rate, tips, total: base + tips }
      })
      setRows(lines)
    } catch {
      toast.error('Gagal memuat gaji')
    }
  }

  React.useEffect(()=>{ if(employeeId) load() }, [employeeId, from, to, employees])

  const grand = rows.reduce((acc,r)=> ({ jam: acc.jam + parseFloat(r.jam), tips: acc.tips + r.tips, total: acc.total + r.total }), { jam:0, tips:0, total:0 })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Gaji & Tip</CardTitle>
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            Total Jam: <b>{grand.jam.toFixed(2)}</b> • Total Tip: <b>{grand.tips.toLocaleString('id-ID')}</b> • Total Bayar: <b>{grand.total.toLocaleString('id-ID')}</b>
          </div>
        </CardHeader>
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
              <TR><TH>Tanggal</TH><TH>Jam Kerja</TH><TH>Rate/Jam</TH><TH>Tip</TH><TH>Total</TH></TR>
            </THead>
            <TBody>
              {rows.map((r,i)=>(
                <TR key={i}>
                  <TD>{r.tanggal}</TD>
                  <TD>{r.jam}</TD>
                  <TD>{r.rate.toLocaleString('id-ID')}</TD>
                  <TD>{r.tips.toLocaleString('id-ID')}</TD>
                  <TD className="font-medium">{r.total.toLocaleString('id-ID')}</TD>
                </TR>
              ))}
              {rows.length===0 && (
                <TR><TD colSpan={5} className="py-6 text-center text-[hsl(var(--muted-foreground))]">Belum ada data</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
