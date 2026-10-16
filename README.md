# Fefina Sweets — POS & Konsinyasi UMKM

Aplikasi kasir, gudang bahan, produksi (resep + HPP FIFO), konsinyasi, keuangan, dan
laporan laba untuk UMKM manisan. Dibangun dengan Next.js 16 + Supabase.

## Cara menjalankan

```bash
npm install
npm run dev     # mode ngoding (Turbopack, ada compile per halaman)
npm run build   # sekali, sebelum operasional
npm run start   # mode production (cepat, tanpa compile) — untuk jualan harian
```

## Persiapan database (sekali)

1. Supabase Dashboard → SQL Editor → jalankan `db-draft.md` **BAGIAN 1–6** berurutan
   (sudah termasuk cicilan, jatuh tempo, supplier, kategori, SKU, index, guard rugi Rp 0 —
   satu file, sekali jalan).
3. Authentication → Add user (email + password) untuk login pertama.
4. Storage `foto-produk` sudah dibuat oleh BAGIAN 6 db-draft.
<<<<<<< HEAD
5. Menu Pengguna → tautkan Auth ID (UID dari Authentication) + peran ke tiap staf.
=======
5. Buat admin pertama via SQL (lihat contoh query di PANDUAN → Peran Pengguna),
   lalu login dengan email itu. Staf daftar di halaman Daftar → acc di menu Pengguna.
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354

## Struktur singkat

```
src/app/         1 folder = 1 menu, hanya UI + panggil services
src/components/  ui/ (bersama) + common/ (dipakai banyak halaman)
src/features/    <nama>/components/ (khusus 1 fitur)
src/layouts/     kerangka halaman + guard peran
src/config/      supabase client
src/constants/  nilai tetap (app.js)
src/hooks/       usePeriode (preset tanggal)
src/services/   modal.js (peta HPP)
src/store/       CartContext, RoleContext
src/utils/       format.js, image.js
```

Aturan main + peta tabel→file: lihat `ARCHITECTURE.md`.
Panduan pakai per menu (untuk staf): lihat `PANDUAN.md`.

## Rumus laba (seragam di Dashboard, Keuangan, Laporan)

```
Laba = Omset − HPP − Beban operasional   (HPP dari detail_transaksi.hpp_satuan)
```

Semua tanggal memakai WIB (`lib/format.js`: `todayWIB`, `wibDayBounds`, `wibKey`).

## Peran (UI-level)

| Peran  | Menu |
|--------|------|
| Admin  | semua |
| Owner  | Dashboard, Produk, Keuangan, Riwayat, Laporan, Profil |
| Kasir  | Kasir, Stok, Riwayat, Profil |

Catatan jujur: RLS di database masih terbuka (`FOR ALL TO authenticated`), jadi peran
ini pembatas alur kerja di UI, bukan pengaman data. Jangan bagikan akun login.
