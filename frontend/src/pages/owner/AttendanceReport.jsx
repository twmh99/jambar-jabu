import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Table, TBody, THead, TH, TR, TD } from '../../components/ui/table'
import { Input, Label, Select } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import DownloadButton from '../../components/common/DownloadButton'
import EmptyState from '../../components/common/EmptyState'
import { toast } from '../../components/ui/toast'
import api from '../../lib/api'

export default function AttendanceReport() {
  const [from, setFrom] = React.useState(() => new Date(Date.now()-6*86400000).toISOString().slice(0,10))
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0,10))
  const [emp, setEmp] = React.useState('')
  const [rows, setRows] = React.useState([])
  const [emps, setEmps] = React.useState([])

  React.useEffect(() => {
    (async () => {
      try {
        const e = await api.get('employees')
        setEmps(e.data)
      } catch {}
    })()
  }, [])

  const load = async () => {
    try {
      const res = await api.get('attendance', { params: { employee_id: emp || undefined } })
      const all = res.data.filter(a => a.tanggal >= from && a.tanggal <= to)
      const mapName = Object.fromEntries(emps.map(e=>[e.id,e.nama]))
      setRows(all.map(a => ({
        tanggal: a.tanggal,
        pegawai: mapName[a.employee_id] || a.employee_id,
        check_in: a.check_in || '-',
        check_out: a.check_out || '-',
        status: a.status || '-',
        tips: a.tips || 0
      })))
    } catch {
      toast.error('Gagal memuat absensi')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Laporan Absensi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div><Label>Dari</Label><Input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div>
            <div><Label>Sampai</Label><Input type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>
            <div className="sm:col-span-2">
              <Label>Pegawai</Label>
              <Select value={emp} onChange={e=>setEmp(e.target.value)}>
                <option value="">Semua Pegawai</option>
                {emps.map(e => <option key={e.id} value={e.id}>{e.nama}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={load}><i className="fa-solid fa-filter mr-2"/>Terapkan</Button>
            {rows.length>0 && (
              <DownloadButton filename={`absensi_${from}_sampai_${to}.csv`} rows={rows} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hasil</CardTitle></CardHeader>
        <CardContent>
          {rows.length===0 ? <EmptyState title="Belum ada data" /> : (
            <Table>
              <THead>
                <TR><TH>Tanggal</TH><TH>Pegawai</TH><TH>Masuk</TH><TH>Pulang</TH><TH>Status</TH><TH>Tip</TH></TR>
              </THead>
              <TBody>
                {rows.map((r, i)=>(
                  <TR key={i}>
                    <TD>{r.tanggal}</TD><TD>{r.pegawai}</TD><TD>{r.check_in}</TD><TD>{r.check_out}</TD><TD>{r.status}</TD>
                    <TD>{new Intl.NumberFormat('id-ID').format(r.tips)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
