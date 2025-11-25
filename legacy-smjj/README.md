# SMJJ Management Dashboard (Next.js 14 App Router)

Tanpa Prisma, tanpa NextAuth. Koneksi langsung ke Neon PostgreSQL (pg). Login manual + cookie session.
Role: OWNER/PEGAWAI. Semua modul dikelola Owner & Pegawai, **kecuali Laporan hanya Owner**.

## Setup
1. Install deps:
   ```bash
   npm i
   ```
2. Duplikasi `.env.example` menjadi `.env` dan isi `DATABASE_URL`, `SESSION_COOKIE_SECRET`, dsb.
3. Inisialisasi DB:
   ```bash
   npm run db:init
   npm run db:seed
   ```
4. Jalankan dev:
   ```bash
   npm run dev
   ```

### Login akun contoh
- Owner: `owner@padsi.com` / `owner123`
- Pegawai: `pegawai@padsi.com` / `pegawai123`

### Halaman
- `/login`
- `/dashboard`
- `/pelanggan`
- `/menu`
- `/riwayat`
- `/reward`
- `/laporan` *(OWNER only)*

## Impor Riwayat & Format CSV
Fitur impor menerima berkas `.csv` atau `.json`. Gunakan header berikut agar data pelanggan otomatis dikenali dan email terisi:

```
nama_pelanggan,email,nomor_telepon,tanggal_transaksi,total_transaksi,poin_didapat
Tina L,tina@mail.com,08121234,2024-03-01,250000,25
```

Kolom yang diterima:
- `nama_pelanggan` / `customer_name` / `nama`
- `email` / `email_pelanggan`
- `nomor_telepon` / `phone` / `no_hp`
- `tanggal_transaksi` / `visited_at` / `tanggal`
- `total_transaksi` / `total_spend`
- `poin_didapat` / `earned_pts`

Jika pelanggan lama belum memiliki email, sistem akan mengisinya dari data impor pertama yang memuat email tersebut.

## Pengujian Manual yang Disarankan
1. Jalankan `npm run dev` dan login menggunakan akun contoh.
2. Tambah/hapus menu & pelanggan dari UI untuk memastikan notifikasi lokal muncul.
3. Unggah CSV contoh di halaman Riwayat dan cek bahwa data masuk ke tabel kunjungan maupun pelanggan.
4. Dari halaman Pelanggan klik tombol **Tukar** kemudian buka `/reward` untuk memastikan paket penukaran menambah log.
5. Di halaman Laporan, gunakan tombol **Cetak PDF** & **Export Excel** untuk memastikan indikator loading bekerja dan file memuat ringkasan KPI serta penjualan per bulan.
