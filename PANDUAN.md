# Panduan Pakai Fefina Sweets — untuk Pemula

Aplikasi kasir + gudang + titip barang (konsinyasi) dalam satu tempat.
Kalau baru pertama kali buka, baca bagian **Persiapan Awal** dulu, lalu ikuti **Alur Kerja** nomor 1–6.

---

## Persiapan Awal (cukup sekali)

1. **Buat akun login.** Buka Dashboard Supabase → Authentication → Add user → isi email + password.
   Login di aplikasi pakai email itu. (Tabel `pengguna` sudah dihapus dari menu dan tidak dipakai.)
2. **Aktifkan foto produk (opsional tapi disarankan).** Buka Supabase → SQL Editor → jalankan:
   ```sql
   insert into storage.buckets (id, name, public)
   values ('foto-produk', 'foto-produk', true)
   on conflict (id) do nothing;

   create policy "Foto publik bisa dibaca"
   on storage.objects for select using (bucket_id = 'foto-produk');

   create policy "Login bisa upload foto"
   on storage.objects for insert to authenticated with check (bucket_id = 'foto-produk');

   create policy "Login bisa hapus foto"
   on storage.objects for delete to authenticated using (bucket_id = 'foto-produk');
   ```
   Tanpa ini, tambah produk **tanpa foto tetap jalan** — yang error hanya upload fotonya.
3. **Isi data dasar** sesuai urutan ini: Bahan Baku → Produk (+ resep) → Reseller. Baru setelah itu Kasir dan Konsinyasi bisa dipakai.

---

## 1. Dashboard (ringkasan toko hari ini)

**Gunanya:** layar pertama setelah login. Melihat kondisi toko sekilas tanpa buka menu lain.

**Isinya:**
- Jumlah produk aktif, omset hari ini, pengeluaran bulan ini, laba bulan ini.
- Grafik penjualan 7 hari terakhir.
- Produk paling laris (top 5).
- Peringatan "perlu restok" untuk produk yang stoknya ≤ 5.

**Cara pakai:** tidak ada yang perlu diisi. Kalau ada peringatan restok, klik untuk lompat ke menu Stok.

---

## 2. Bahan Baku (gudang tepung, gula, dsb.)

**Gunanya:** mencatat bahan mentah sebelum dimasak. Dari sinilah modal/HPP semua produk berasal.

**Konsep penting (cukup paham 2 ini):**
- **WAC (harga rata-rata):** kalau beli gula 2 kali dengan harga beda, sistem menghitung harga rata-ratanya sendiri. Contoh: 1000 gram Rp20.000 lalu 1000 gram Rp24.000 → WAC = Rp22/gram.
- **Batch FIFO:** setiap pembelian dicatat sebagai 1 batch lengkap dengan tanggal kadaluarsa. Saat produksi, bahan diambil dari batch yang paling cepat kadaluarsa dulu (yang mau basi dipakai duluan).

**Cara pakai:**
1. Tab **Bahan Baku** → Tambah Bahan → isi nama + satuan (ketik bebas: gram, kg, ml, liter, pcs, pack, sachet, butir…). Stok awal otomatis 0, itu normal.
2. Tiap habis kulakan → **Catat Pembelian** → pilih bahan, isi jumlah + total bayar + tanggal kadaluarsa (kalau ada). Simpan. Stok + WAC + batch terisi otomatis.
3. Klik **Lihat batch FIFO** pada tiap bahan untuk melihat sisa per lot pembelian dan tanggal kadaluarsanya.
4. Tab **Riwayat Beli** = arsip semua kulakan (tanggal, jumlah, total biaya).

---

## 3. Manajemen Produk (katalog jualan)

**Gunanya:** daftar barang jadi yang tampil di Kasir, lengkap dengan harga jual, margin, dan stok.

**Cara pakai:**
1. **Tambah Produk** → isi nama, **harga jual**, stok awal, foto (opsional), deskripsi. Simpan.
   - Modal (HPP) tidak diisi manual — dihitung otomatis dari resep × harga bahan.
   - Kolom Margin menunjukkan untung per produk (hijau kalau ≥ 30%).
2. Toggle **Aktif** untuk menyembunyikan/menampilkan produk di Kasir tanpa menghapus.
3. Ikon pensil = ubah, ikon tempat sampah = sembunyikan dari kasir.

---

## 4. Produksi & Resep (dapur)

**Gunanya:** menghubungkan bahan baku ke produk jadi, lalu mencatat hasil masakan.

**Cara pakai:**
1. Pilih produk di dropdown atas.
2. **Tambah Bahan** ke resep → pilih bahan → pilih **Isi takaran per: Per 1 pcs**
   (langsung ketik takaran 1 pcs) atau **Per 1 kuali** (ketik takaran 1 kuali + jadi berapa pcs,
   otomatis dikonversi dan tersimpan per pcs).
   Contoh: gula 1000 gram per kuali, jadi 10 pcs → tersimpan 100 gram per pcs.
   Hasil per kuali diingat per produk, jadi besok tidak ketik ulang.
3. Setiap selesai masak → **Catat Produksi** → pilih **Per kuali** (isi jumlah kuali + hasil per kuali)
   atau **Pcs langsung**. Simpan.
   - Stok produk nambah, HPP batch dikunci, dan stok bahan kepotong otomatis (FIFO).
   - Kalau stok bahan kurang, muncul peringatan kuning — tetap bisa disimpan (stok bahan jadi minus sebagai tanda harus segera kulakan).
4. Panel kanan = **Riwayat Produksi** (log dapur) dan batch aktif produk yang dipilih.

---

## 5. Kasir / POS (jualan harian)

**Gunanya:** melayani pembeli — scan/klik produk, terima uang, cetak struk.

**Cara pakai:**
1. Cari produk (ketik nama) atau klik kartu produk → tombol **+** untuk tambah ke keranjang.
2. Tombol **Urutkan** untuk susun tampilan (nama, termurah, termahal, stok terbanyak). Klik di luar menu untuk menutupnya.
3. Di panel kanan: atur diskon (Rp), pilih tipe (Toko / GoFood+25% / Grab+25%), pilih metode (Tunai / QRIS / Transfer).
4. Kalau Tunai: ketik uang diterima → kembalian muncul otomatis. Klik **Proses Pembayaran & Cetak Struk**.
5. **Hold** = menahan pesanan yang belum bayar (misal pelanggan ke ATM dulu). Keranjang
   tersimpan di browser, ambil lagi lewat tombol Hold di atas keranjang. Bukan membatalkan.
6. Stok berkurang otomatis dan HPP tercatat sendiri — tidak perlu hitung manual.
7. **Metode QRIS/Transfer:** tidak tersambung ke bank/ewallet — aplikasi hanya menampilkan
   gambar QRIS + nominal ke pembeli (kasir yang cek bukti bayar). Pasang gambarmu di
   `public/qris.png`, ubah norek di `src/lib/constants.js` (`PEMBAYARAN_INFO`).
8. Setelah **Selesaikan Pembayaran** muncul struk: **Cetak Struk** untuk print,
   **Selesai — Transaksi Baru** untuk lanjut ke pembeli berikutnya. Qty keranjang mentok
   stok toko — tidak bisa tambah melebihi stok.

---

## 6. Stok (atur cepat) & Stock Opname (audit)

**Menu Stok — gunanya:** lihat sisa semua produk + koreksi cepat (tombol −20…+20).
Setiap koreksi tercatat resmi sebagai opname: kalau minus, nilainya otomatis masuk sebagai beban operasional.

**Menu Stock Opname — gunanya:** arsip hasil hitung fisik vs catatan sistem.
**Cara pakai:** Opname Baru → pilih produk → isi **stok fisik hasil hitungan** + pilih **alasan**
(Hilang / Rusak-basi / Kadaluarsa) + keterangan. Selisih minus otomatis jadi beban di Keuangan
(mengurangi laba) — alasan Rusak/Kadaluarsa masuk kategori *Kerugian / Rusak*.

---

## 7. Konsinyasi & Reseller (titip barang ke warung)

**Gunanya:** nitip produk ke toko orang, catat yang laku, tagih uangnya.

**Cara pakai:**
1. **Buat Nota Titip Baru** → pilih toko → isi tanggal → tambah macam produk + jumlah pcs. Simpan. Stok toko berkurang otomatis (barang pindah ke mitra).
2. Tiap ada kabar dari mitra → buka notanya → **Catat Laku & Retur** → isi sekaligus
   untuk semua produk: **+Laku**, **+Retur bagus**, **+Retur rusak** (laku+retur tidak boleh
   melebihi titip). Total tagihan nota ikut naik. Retur bagus kembali ke stok saat nota
   diselesaikan; retur rusak otomatis dicatat sebagai rugi.
3. **Invoice WA** = kirim tagihan ke WhatsApp mitra otomatis (isi pesan sudah jadi).
4. Sudah dibayar → **Proses Pelunasan**. Sudah selesai semua (tidak nitip lagi) → **Selesaikan (Tarik Retur)** agar sisa barang kembali ke stok.
5. Ikon pensil = ubah nota (tambah/kurang titipan, ubah laku, ubah **Status Nota** Berjalan/Selesai). Ikon sampah = hapus nota (sisanya kembali ke stok).
6. Tab **Data Mitra Reseller** = ringkasan per toko (jumlah nota + tagihan belum lunas).
7. Panel kanan nota yang dipilih ada **Aktivitas Nota Ini** = jejak tiap pengecekan (nota dibuat,
   laku & retur, diubah, pelunasan, selesai). Tiap update nambah 1 baris di sini — inilah
   histori pengecekanmu. **Butuh sekali jalan:** buat tabelnya di SQL Editor (lihat bawah).

---

## 8. Data Reseller (daftar toko mitra)

**Gunanya:** buku alamat warung/toko tempat nitip barang (nama toko, pemilik, WA, alamat).
**Cara pakai:** Tambah → isi semua kolom → Simpan. Ikon pensil/sampah untuk ubah/nonaktifkan. Data ini yang muncul di dropdown toko pada menu Konsinyasi.

**Alur uangnya (2 kejadian terpisah — ini penting):**
1. **Laku** = barang terjual di warung mitra → omset + tagihan naik (uang BELUM diterima).
   Contoh: titip 10, laku 4 @Rp15.000 → tagihan Rp60.000.
2. **Bayar** = uang diterima saat kunjungan (boleh random/sebagian, misal bayar Rp40.000
   dulu) → catat via **Catat Bayar** → sisa tinggal Rp20.000. Status jadi Lunas otomatis
   kalau sudah genap. Kunjungan berikut lunasi sisanya.
3. Uang bayar **tidak** nambah omset lagi (kalau nambah = double). Yang bertambah adalah
   kas, yang berkurang adalah **piutang** (lihat kartu Piutang Konsinyasi & di Keuangan).

---

## 9. Keuangan & Kas (ringkasan saja — lihat, jangan tulis)

**Gunanya:** melihat omset, beban operasional, HPP, dan estimasi laba bersih periode tertentu.
Halaman ini **hanya ringkasan** (tidak ada form, tidak ada tombol hapus).

**Cara pakai:**
1. Pilih periode (Hari Ini / 7 Hari / Bulan Ini / tanggal manual).
2. Baca 4 kartu: Omset − HPP − Beban = **Estimasi Laba Bersih** (+ margin %).
3. Grafik = tren omset vs pengeluaran harian. Dua tabel bawah = rincian beban dan rincian nota penjualan (klik nota untuk lihat struk + cetak ulang).
4. Mau catat/hapus pengeluaran → buka menu **Catat Pengeluaran**.

## 9b. Catat Pengeluaran (tulis & kelola kas keluar)

**Gunanya:** mencatat dan menghapus tiap uang keluar selain kulakan bahan.
**Cara pakai:** isi keterangan + nominal + tanggal + kategori → Simpan. Daftar kanan bisa dicari + dihapus, totalnya dihitung otomatis.

---

## 10. Riwayat (semua struk)

**Gunanya:** mencari nota lama berdasarkan tanggal atau ID (misal `TRX-...`).
**Cara pakai:** atur rentang tanggal → cari ID bila perlu → klik baris untuk lihat struk → cetak ulang atau unduh CSV.

---

## 11. Laporan Laba (rekap per hari)

**Gunanya:** tabel laba rugi harian + tombol arsip.
**Cara pakai:** pilih periode → periksa baris merah (hari yang rugi) → **Excel/CSV** untuk arsip atau **PDF/Cetak** untuk laporan. Omset & HPP sudah termasuk laku konsinyasi (dialokasikan ke tanggal titip; HPP konsinyasi = estimasi modal × pcs laku).

---

## 12. Profil

**Gunanya:** info akun di perangkat ini + tombol Keluar + panduan 4 langkah singkat.

---

## Alur Kerja yang Disarankan

**Setiap hari:** buka Kasir → jualan → malam cek Keuangan & Kas.
**Setiap kulakan:** catat di Bahan Baku → Catat Pembelian.
**Setiap masak:** catat di Produksi → Catat Produksi.
**Setiap minggu:** cek Stok (peringatan menipis) + Opname etalase + update barang laku di Konsinyasi + kirim Invoice WA.
**Setiap bulan:** unduh Laporan Laba sebagai arsip.

---

## Rumus Laba (seragam di semua halaman)

```
Laba = Omset − HPP − Beban operasional
```

HPP diambil dari `hpp_satuan` tiap barang laku (dikunci otomatis saat transaksi).
Kalau HPP terlihat 0, berarti batch-nya dibuat sebelum resep ada (lihat penjelasan HPP terkunci di menu Produksi).

## Peran Pengguna

- **Admin:** semua menu.
- **Owner:** Dashboard, Produk, Keuangan, Riwayat, Laporan, Profil.
- **Kasir:** Kasir, Stok, Riwayat, Profil.

Menautkan: Supabase Authentication → salin UID → menu Pengguna → tempel ke Auth ID staf + pilih peran.
Tanpa Auth ID, akses penuh (mode kompatibilitas). Ini pembatas alur kerja di layar,
bukan pengaman database — jangan bagikan akun login.

<<<<<<< HEAD
=======
Pendaftaran mandiri (butuh db-draft.md BAGIAN 8 sekali): staf buka halaman Daftar
(link di halaman Masuk) → isi nama/username/email/password → namanya masuk daftar
"Menunggu persetujuan" di menu Pengguna → Admin pilih peran + Setujui. Akun auth
lama yang login juga otomatis masuk daftar menunggu ini. Yang belum disetujui
tidak bisa masuk walau email-passwordnya benar.

Admin pertama (sekali, ganti emailnya): jalankan di SQL Editor, lalu login
dengan email itu — tidak perlu tempel UID, login mencocokkan baris via email
otomatis:

```
INSERT INTO public.pengguna (nama_lengkap, username, email, role_akses, is_disetujui, is_deleted)
VALUES ('Pemilik Toko', 'owner', 'GANTI_DENGAN_EMAIL_ANDA', 'Admin', true, false)
ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, role_akses = 'Admin', is_disetujui = true, is_deleted = false;
```

>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
## Koreksi Salah Input (Void)

- **Transaksi kasir salah:** buka Riwayat → klik nota → **Void / Batalkan**. Stok kembali
  otomatis via trigger, nota tetap tersimpan berstatus Dibatalkan (tidak dihapus).
- **Pembelian/produksi salah:** tidak bisa dihapus (merusak FIFO). Betulkan ke depan:
  pembelian salah → sesuaikan di pembelian berikutnya / nonaktifkan bahan dan buat baru;
  resep salah → ubah takarannya; stok salah → catat opname yang benar.

---

## Kalau Ada Error

- **"Harga jual wajib diisi"** → isi kolom Harga Jual (sudah ada di form).
- **Soal bucket foto** → tambah produk tanpa foto tetap bisa; pasang SQL bucket dari Persiapan Awal agar foto jalan.
- **"Stok tidak cukup"** → kurangi jumlah / kulakan bahan dulu (produksi tetap bisa jalan dengan stok minus sebagai penanda).
- **"Ditolak database (RLS/policy)"** → pastikan sudah login; kalau baru ganti database, pastikan query di `db-draft.md` sudah dijalankan semua di SQL Editor.
- **Pindah menu terasa lambat + ada tulisan Compiling** → itu mode dev (`npm run dev`). Untuk operasional harian jalankan `npm run build` sekali lalu `npm run start`.
