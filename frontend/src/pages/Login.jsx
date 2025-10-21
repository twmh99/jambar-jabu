import React from 'react'
import { Input, Label } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { toast } from '../components/ui/toast'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const heroImg = 'https://images.unsplash.com/photo-1666032119084-82351976a922'

export default function Login() {
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const username = fd.get('username')?.trim()
    const password = fd.get('password')?.trim()

    if (!username || !password) {
      toast.error('Isi username & password')
      return
    }

    try {
      // Standar OAuth2: form-urlencoded
      const form = new URLSearchParams()
      form.append('username', username)
      form.append('password', password)

      const res = await api.post('auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const { access_token, role, name } = res.data
      const normalizedRole = (role || '').toLowerCase()

      // 💾 Simpan token & user
      localStorage.setItem('smpj_token', access_token)
      localStorage.setItem('smpj_role', normalizedRole)
      localStorage.setItem('smpj_user', JSON.stringify({ name, role: normalizedRole, username }))

      toast.success('Berhasil masuk!')

      // 🚀 Redirect sesuai role
      if (normalizedRole === 'owner') navigate('/owner')
      else if (normalizedRole === 'supervisor') navigate('/supervisor/dashboard')
      else if (normalizedRole === 'employee') navigate('/employee')
      else {
        toast.error('Peran pengguna tidak dikenali')
        navigate('/login')
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Login gagal'
      toast.error(`❌ ${msg}`)
      console.error('Login error:', err?.response?.status, err?.response?.data)
    }
  }

  // ❌ Hapus auto redirect — biarkan user login manual setiap kali
  // React.useEffect(() => { ... }) dihapus

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* LEFT HERO IMAGE */}
      <div
        className="hidden md:block relative noise-overlay"
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(12,30,53,0.6), rgba(12,30,53,0.6))',
          }}
        />
        <div className="absolute bottom-8 left-8 right-8 text-[hsl(var(--primary-foreground))]">
          <h1 className="text-4xl sm:text-5xl font-display font-semibold leading-tight">
            SMPJ — Sistem Manajemen Pegawai & Jadwal
          </h1>
          <p className="mt-3 text-[hsl(var(--muted))] max-w-lg">
            Kelola jadwal, absensi, dan gaji pegawai Jambar Jabu secara cepat dan transparan.
          </p>
        </div>
      </div>

      {/* RIGHT LOGIN FORM */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <form onSubmit={submit} className="ds-card w-full max-w-md p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Masuk</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Masukkan <b>Username dan Password Anda</b>.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="username"
                autoComplete="username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="password"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full">
              Masuk
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
