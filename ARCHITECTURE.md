# Arsitektur Fefina Sweets

## Struktur Folder

```
src/
  app/                  → 1 folder = 1 menu (route, WAJIB di sini — file-based routing).
                        Hanya UI + panggil services. middleware.js di sini (aturan Next).
    page.js             → Dashboard          (produk, transaksi, pengeluaran, detail, konsinyasi)
    kasir/page.js       → Kasir/POS          (baca produk; tulis transaksi_penjualan + detail_transaksi)
    produk/page.js      → Manajemen Produk   (produk + view_modal_produk + batch_produk)
    produksi/page.js    → Produksi & Resep   (resep_produk + riwayat_produksi + batch_produk)
    bahan/page.js       → Bahan Baku         (bahan_baku + riwayat_beli_bahan + batch_bahan_baku + supplier)
    stok/page.js        → Stok               (baca produk; tulis penyesuaian_stok)
    opname/page.js      → Stock Opname       (penyesuaian_stok)
    konsinyasi/page.js  → Konsinyasi         (nota + detail + mitra + pembayaran + aktivitas)
    reseller/page.js    → Data Reseller      (mitra_toko)
    pengguna/page.js    → Pengguna           (setujui pendaftar + atur peran + taut auth_id)
    pengeluaran/page.js → Keuangan (RINGKASAN baca-saja: metrik + tren + 2 tabel)
    catat-pengeluaran/page.js → Pencatatan pengeluaran (form + hapus)
    transaksi/page.js   → Riwayat + Void     (transaksi_penjualan + detail_transaksi)
    laporan/page.js     → Laporan Laba       (transaksi + pengeluaran + konsinyasi)
    login/page.js       → Login (Supabase Auth + lupa password + tolak yang belum disetujui)
    register/page.js    → Daftar mandiri (signUp + baris pengguna menunggu persetujuan)
    pengaturan/page.js  → Profil (user asli + peran)
  assets/               → global CSS/Tailwind.
  components/
    ui/                 → dasar reusable (PageHeader, Badge, EmptyState, StatCard,
                        Select, RupiahInput).
    common/            → dipakai banyak halaman (Sidebar, Header).
  features/<nama>/components/ → komponen khusus 1 fitur
                        (kasir: CartPanel/StrukNota; produk/reseller/konsinyasi: modal).
  layouts/              → kerangka halaman (DashboardLayout + guard peran).
  config/               → inisialisasi BaaS (supabase.js).
  constants/            → nilai tetap (app.js: status, satuan, limit, peran, info bayar).
  hooks/                → logika state dipakai ulang (usePeriode: preset tanggal).
  services/             → query BaaS dipakai ulang (modal.js: peta HPP).
  store/                → global state Context API (CartContext, RoleContext).
  utils/                → helper murni (format.js: rupiah/tanggal/WIB/ID/error,
                        image.js: kompres foto).
```

## Aturan Main (biar konsisten)

1. **Query database hanya di `src/app/*/page.js`, lewat `services/` bila dipakai ulang.**
   Komponen di `components/`/`features/` tidak boleh panggil `supabase` langsung —
   data dikirim lewat props (`onSubmit`, `resellers`, `products`).
   Pengecualian: `CartPanel` (tulis transaksi kasir) dan modal produk (upload foto).
2. **Semua dropdown pakai `components/ui/Select`** (variant `form` di form/modal,
   `filter` di bilah saring) — jangan pakai `<select>` mentah agar tema seragam.
3. **Semua input rupiah pakai `components/ui/RupiahInput`** — ketik angka biasa,
   tampil bertitik otomatis (50.000). Nilainya tetap string digit mentah.
4. **Jangan tulis angka/teks status langsung di halaman.** Ambil dari `src/lib/constants.js`
   (`STATUS_PEMBAYARAN`, `STATUS_KONSINYASI`, `SATUAN_BAHAN`, `LIMITS`, `STOK_KRITIS`,
   `KATEGORI_PENGELUARAN`, `PEMBAYARAN_INFO`, `MENU_PER_ROLE` di `context/RoleContext.js`).
5. **Semua tanggal pakai WIB** (`todayWIB`, `wibKey`, `wibDayBounds`, `wibDateTime`).
   Jangan `toISOString().split("T")[0]` untuk batas hari dan jangan hardcode `T08:00:00`.
5. **Stok tidak pernah diubah manual dari frontend**, kecuali 2 kasus yang memang tidak punya
   trigger: edit/hapus baris konsinyasi dan hapus nota. Sisanya lewat tabel riwayat agar
   trigger database yang mengerjakan (lihat tabel di bawah).
6. **Modal pakai `key={id}` saat dibuka untuk data berbeda** agar state lama tidak nyangkut.

## Aturan warna 60-30-10

- **60% dominan** — latar aplikasi `#f8f9ff` + permukaan slate-50. Jangan taruh warna
  lain sebagai background luas.
- **30% sekunder** — kartu/sidebar/input putih + `#eff4ff`. Netral: slate.
- **10% aksen** — emerald-700 untuk CTA dan status aktif. Satu-satunya warna aksi.
- **Warna semantik** (bukan aksen): hijau=berhasil/lunas, amber=peringatan/belum lunas,
  merah=bahaya/habis/rugi, biru=info/tunai. Jangan pakai sky/purple/orange/stone
  (struk cetak monokrom dikecualikan).
- **Dilarang pajangan palsu**: tidak ada badge/status/tombol yang tidak berfungsi
  (dulu: Shift Pagi, Kasir Buka, ikon bel, Sesi #01 — sudah dibuang).

## Aturan responsif

- Kartu metrik: `grid-cols-2` di HP, 3-4 kolom di layar besar. Angka besar pakai
  `break-words` + ukuran turun di HP (`text-xl sm:text-[26px]`).
- Semua tabel dalam `overflow-x-auto` + `min-w` — tidak boleh melebar melewati layar HP.
- Grid konten (`grid-cols-12`): 1 kolom di HP (`col-span-12`), multi-kolom dari `xl`.
- Modal: `w-full max-w-*` + padding layar (`p-4`); drawer kanan `max-w-md/lg`.

## Alur Tulis Database (frontend → trigger)

| Aksi user            | Frontend tulis ke        | Trigger DB mengerjakan                    |
|----------------------|--------------------------|-------------------------------------------|
| Catat Pembelian      | `riwayat_beli_bahan`     | stok + WAC `bahan_baku`, buat batch FIFO  |
| Catat Produksi       | `riwayat_produksi`       | kunci HPP, stok+batch produk, potong bahan|
| Bayar di Kasir       | `transaksi_penjualan` + `detail_transaksi` | harga/HPP historis, potong stok FIFO |
| Buat Nota Titip      | `nota_konsinyasi` + `detail_konsinyasi` | potong stok                               |
| Selesaikan Nota      | `nota_konsinyasi.status_konsinyasi` | retur bagus + sisa belum jelas → stok, rusak → beban |
| Opname / Stok cepat  | `penyesuaian_stok`       | selisih, stok+batch, beban bila minus     |
| Void nota kasir      | `transaksi_penjualan.status_transaksi` | trigger kembalikan stok + batch    |
| Cicilan konsinyasi   | `pembayaran_konsinyasi` (db-draft.md BAGIAN 2) | trigger set Lunas bila cicilan ≥ tagihan |

## Batasan jujur (jangan dilanggar diam-diam)

- **Peran = UI-level.** RLS masih `FOR ALL TO authenticated`, jadi filter menu tidak
  menghalangi akses data langsung. Butuh keamanan beneran → tulis policy per-role di DB.
- **Stok minus diizinkan DB** (trigger tanpa guard). Produksi sengaja boleh minus sebagai
  mode "hutang bahan". Kasir dicegah via cek stok fresh sebelum bayar.
- **Edit/hapus baris konsinyasi = read-then-write manual** (tanpa transaksi DB) karena
  tidak ada trigger UPDATE/DELETE detail. Risiko balapan kecil, diterima sadar.
- **Fitur baru** (cicilan, jatuh_tempo, supplier, kategori, sku) nonaktif otomatis
  + berpesan bila db-draft.md belum dijalankan penuh — jangan hapus fallback-nya.

## Cara Debug Cepat

1. **Error tulisan merah di form** → baca pesannya, itu pesan asli database/validasi.
2. **Halaman kosong padahal data ada** → cek nama tabel/kolom di `page.js` lawan `db-draft.md`.
3. **RLS/policy** → pastikan sudah login; query `db-draft.md` bagian 6 sudah dijalankan.
4. **Foto gagal upload** → pastikan bucket `foto-produk` ada (lihat PANDUAN.md).
5. **Modal bertingkah aneh** → pastikan pemanggilnya pakai `key={...}`.
6. **Pindah menu lambat + Compiling** → itu mode dev; operasional pakai `npm run start`.
