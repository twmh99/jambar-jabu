import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Input, Label } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { toast } from '../../components/ui/toast'
import api from '../../lib/api'

export default function Profile() {
  const user = JSON.parse(localStorage.getItem('smpj_user') || '{}')
  const [name, setName] = React.useState(user?.name || '')
  const [phone, setPhone] = React.useState('')
  const [password, setPassword] = React.useState('')

  // Catatan: backend contoh belum sediakan endpoint update profil.
  // Di sini hanya simpan ke localStorage agar UX tidak menggantung.
  const save = async (e) => {
    e.preventDefault()
    try {
      // TODO: ganti ke endpoint update user bila tersedia
      localStorage.setItem('smpj_user', JSON.stringify({ ...(user||{}), name }))
      toast.success('Profil disimpan (lokal).')
    } catch {
      toast.error('Gagal menyimpan profil')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Profil Saya</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nama</Label>
              <Input value={name} onChange={e=>setName(e.target.value)} required />
            </div>
            <div>
              <Label>Telepon</Label>
              <Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <div>
              <Label>Password Baru</Label>
              <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Opsional" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
