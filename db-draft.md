fefina-sweets-db | wQo13n9RlXK4IYqO

https://ccaqthfwhnvqacvveqpg.supabase.co
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjYXF0aGZ3aG52cWFjdnZlcXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3Njg3MDcsImV4cCI6MjEwNzM0NDcwN30.43fi8BT8JfPbAt_qY4rCMQ4vZfF-75bVKYGeV68KpP4

-- ==============================================================================
-- ==============================================================================
-- ATURAN JALAN:
-- - Instalasi baru: jalankan BAGIAN 1 → 2 → 3 → 4 → 5 → 6 berurutan.
-- - Update / rerun (data TIDAK hilang): jalankan BAGIAN 3, 4, 5, 6 saja.
--   JANGAN jalankan BAGIAN 1 (DROP = reset total) dan BAGIAN 2 (CREATE TABLE
--   biasa = error bila tabel sudah ada) kecuali mau instal ulang dari nol.
-- - BAGIAN 7: opsional, SEKALI JALAN setelah BAGIAN 5 (rapikan keterangan
--   pengeluaran lama ID → nama produk). Aman diulang (baris yang sudah rapi
--   tidak tersentuh lagi).
-- - BAGIAN 8: registrasi mandiri pengguna (aman di-rerun, SEKALI saja cukup).
-- ==============================================================================
-- BAGIAN 1: PENGHAPUSAN SKEMA LAMA (RESET / FRESH INSTALL)
-- ==============================================================================
DROP TABLE IF EXISTS public.pembayaran_konsinyasi CASCADE;
DROP TABLE IF EXISTS public.aktivitas_konsinyasi CASCADE;
DROP TABLE IF EXISTS public.penyesuaian_stok CASCADE;
DROP TABLE IF EXISTS public.detail_konsinyasi CASCADE;
DROP TABLE IF EXISTS public.nota_konsinyasi CASCADE;
DROP TABLE IF EXISTS public.detail_transaksi CASCADE;
DROP TABLE IF EXISTS public.transaksi_penjualan CASCADE;
DROP TABLE IF EXISTS public.riwayat_produksi CASCADE;
DROP TABLE IF EXISTS public.resep_produk CASCADE;
DROP TABLE IF EXISTS public.batch_produk CASCADE;
DROP TABLE IF EXISTS public.produk CASCADE;
DROP TABLE IF EXISTS public.riwayat_beli_bahan CASCADE;
DROP TABLE IF EXISTS public.batch_bahan_baku CASCADE;
DROP TABLE IF EXISTS public.bahan_baku CASCADE;
DROP TABLE IF EXISTS public.supplier CASCADE;
DROP TABLE IF EXISTS public.mitra_toko CASCADE;
DROP TABLE IF EXISTS public.pengeluaran_toko CASCADE;
DROP TABLE IF EXISTS public.pengguna CASCADE;


-- ==============================================================================
-- BAGIAN 2: PEMBUATAN STRUKTUR TABEL UTAMA (ENTERPRISE ERP STANDARDS)
-- ==============================================================================

-- 1. Tabel Pengguna (registrasi mandiri: email + is_disetujui;
-- pendaftar baru selalu menunggu persetujuan, admin yang meng-acc + pilih peran)
CREATE TABLE public.pengguna (
  id_pengguna uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nama_lengkap character varying NOT NULL,
  username character varying NOT NULL UNIQUE,
  email character varying UNIQUE,
  password text,
  role_akses character varying DEFAULT 'Kasir' CHECK (role_akses IN ('Admin', 'Kasir', 'Owner')),
  is_disetujui boolean DEFAULT true,
  is_deleted boolean DEFAULT false, 
  CONSTRAINT pengguna_pkey PRIMARY KEY (id_pengguna)
);

-- 2. Tabel Bahan Baku
CREATE TABLE public.bahan_baku (
  id_bahan uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_bahan character varying NOT NULL,
  stok_bahan numeric(12,2) NOT NULL DEFAULT 0, 
  satuan character varying NOT NULL, 
  harga_rata_rata numeric(12,2) NOT NULL DEFAULT 0 CHECK (harga_rata_rata >= 0),
  is_deleted boolean DEFAULT false, 
  CONSTRAINT bahan_baku_pkey PRIMARY KEY (id_bahan)
);

-- 3. Tabel Batch Bahan Baku
CREATE TABLE public.batch_bahan_baku (
  id_batch_bahan uuid NOT NULL DEFAULT gen_random_uuid(),
  id_bahan uuid NOT NULL,
  stok_sisa numeric(12,2) NOT NULL,
  tanggal_masuk timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  tanggal_kadaluarsa date, 
  CONSTRAINT batch_bahan_pkey PRIMARY KEY (id_batch_bahan),
  CONSTRAINT fk_batch_bahan FOREIGN KEY (id_bahan) REFERENCES public.bahan_baku(id_bahan) ON DELETE RESTRICT
);

-- 4. Tabel Supplier Bahan Baku (Baru dari V2)
CREATE TABLE public.supplier (
  id_supplier uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_supplier character varying NOT NULL,
  kontak character varying,
  is_deleted boolean DEFAULT false,
  CONSTRAINT supplier_pkey PRIMARY KEY (id_supplier)
);

-- 5. Tabel Riwayat Beli Bahan 
CREATE TABLE public.riwayat_beli_bahan (
  id_pembelian uuid NOT NULL DEFAULT gen_random_uuid(),
  id_bahan uuid NOT NULL,
  jumlah_beli numeric(12,2) NOT NULL CHECK (jumlah_beli > 0),
  total_biaya integer NOT NULL CHECK (total_biaya >= 0),
  tanggal_beli timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  tanggal_kadaluarsa date, 
  id_pengguna uuid,
  id_supplier uuid, -- Relasi ke Supplier
  CONSTRAINT riwayat_beli_bahan_pkey PRIMARY KEY (id_pembelian),
  CONSTRAINT fk_bahan_beli FOREIGN KEY (id_bahan) REFERENCES public.bahan_baku(id_bahan) ON DELETE RESTRICT,
  CONSTRAINT fk_pengguna_beli FOREIGN KEY (id_pengguna) REFERENCES public.pengguna(id_pengguna) ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_beli FOREIGN KEY (id_supplier) REFERENCES public.supplier(id_supplier) ON DELETE RESTRICT
);

-- 6. Tabel Produk (Dilengkapi SKU)
CREATE TABLE public.produk (
  id_produk uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_produk character varying NOT NULL,
  sku character varying, -- SKU Produk
  harga_jual integer NOT NULL CHECK (harga_jual >= 0),
  stok integer NOT NULL DEFAULT 0, 
  foto text,
  deskripsi text DEFAULT '',
  is_deleted boolean DEFAULT false, 
  CONSTRAINT produk_pkey PRIMARY KEY (id_produk)
);

-- 7. Tabel Batch Produk (Kunci HPP Produksi)
CREATE TABLE public.batch_produk (
  id_batch_produk uuid NOT NULL DEFAULT gen_random_uuid(),
  id_produk uuid NOT NULL,
  stok_sisa integer NOT NULL,
  hpp_produksi integer NOT NULL DEFAULT 0,
  tanggal_produksi timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  tanggal_kadaluarsa date,
  CONSTRAINT batch_produk_pkey PRIMARY KEY (id_batch_produk),
  CONSTRAINT fk_batch_produk FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE RESTRICT
);

-- 8. Tabel Resep Produk
CREATE TABLE public.resep_produk (
  id_resep uuid NOT NULL DEFAULT gen_random_uuid(),
  id_produk uuid NOT NULL,
  id_bahan uuid NOT NULL,
  jumlah_terpakai numeric(12,2) NOT NULL CHECK (jumlah_terpakai > 0),
  CONSTRAINT resep_produk_pkey PRIMARY KEY (id_resep),
  CONSTRAINT fk_resep_produk FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE CASCADE,
  CONSTRAINT fk_resep_bahan FOREIGN KEY (id_bahan) REFERENCES public.bahan_baku(id_bahan) ON DELETE RESTRICT
);

-- 9. Tabel Riwayat Produksi
CREATE TABLE public.riwayat_produksi (
  id_produksi uuid NOT NULL DEFAULT gen_random_uuid(),
  tanggal_produksi timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  id_produk uuid NOT NULL,
  jumlah_produksi integer NOT NULL CHECK (jumlah_produksi > 0),
  tanggal_kadaluarsa date, 
  id_pengguna uuid,
  CONSTRAINT riwayat_produksi_pkey PRIMARY KEY (id_produksi),
  CONSTRAINT fk_produksi_produk FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE RESTRICT,
  CONSTRAINT fk_produksi_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna(id_pengguna) ON DELETE RESTRICT
);

-- 10. Tabel Transaksi Penjualan 
CREATE TABLE public.transaksi_penjualan (
  id_transaksi character varying NOT NULL, 
  tanggal_transaksi timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  total_pembayaran integer NOT NULL,
  diskon integer NOT NULL DEFAULT 0,
  metode_pembayaran character varying NOT NULL DEFAULT 'Tunai',
  status_transaksi character varying NOT NULL DEFAULT 'Selesai', 
  id_pengguna uuid, 
  diubah_oleh uuid, 
  waktu_diubah timestamp with time zone, 
  CONSTRAINT transaksi_penjualan_pkey PRIMARY KEY (id_transaksi),
  CONSTRAINT fk_transaksi_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna(id_pengguna) ON DELETE RESTRICT,
  CONSTRAINT fk_transaksi_diubah FOREIGN KEY (diubah_oleh) REFERENCES public.pengguna(id_pengguna) ON DELETE RESTRICT
);

-- 11. Tabel Detail Transaksi
CREATE TABLE public.detail_transaksi (
  id_detail uuid NOT NULL DEFAULT gen_random_uuid(),
  id_transaksi character varying NOT NULL,
  id_produk uuid NOT NULL,
  jumlah_beli integer NOT NULL CHECK (jumlah_beli > 0),
  harga_jual_satuan integer NOT NULL DEFAULT 0, 
  hpp_satuan integer NOT NULL DEFAULT 0,        
  subtotal integer NOT NULL,
  CONSTRAINT detail_transaksi_pkey PRIMARY KEY (id_detail),
  CONSTRAINT fk_detail_transaksi FOREIGN KEY (id_transaksi) REFERENCES public.transaksi_penjualan(id_transaksi) ON DELETE CASCADE,
  CONSTRAINT fk_detail_produk FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE RESTRICT
);

-- 12. Tabel Pengeluaran Toko (Dilengkapi Kategori)
CREATE TABLE public.pengeluaran_toko (
  id_pengeluaran uuid NOT NULL DEFAULT gen_random_uuid(),
  tanggal timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  kategori character varying NOT NULL DEFAULT 'Lainnya', -- Kategori Pengeluaran
  keterangan text NOT NULL,
  nominal integer NOT NULL CHECK (nominal > 0),
  id_pengguna uuid,
  CONSTRAINT pengeluaran_toko_pkey PRIMARY KEY (id_pengeluaran),
  CONSTRAINT fk_pengeluaran_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna(id_pengguna) ON DELETE RESTRICT
);

-- 13. Tabel Mitra Toko
CREATE TABLE public.mitra_toko (
  id_mitra uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_toko character varying NOT NULL,
  nama_pemilik character varying,
  no_whatsapp character varying,
  alamat text,
  is_deleted boolean DEFAULT false, 
  tanggal_daftar timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mitra_toko_pkey PRIMARY KEY (id_mitra)
);

-- 14. Tabel Nota Konsinyasi (Dilengkapi Tanggal Jatuh Tempo)
CREATE TABLE public.nota_konsinyasi (
  id_konsinyasi character varying NOT NULL,
  tanggal_titip timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  jatuh_tempo date, -- Tanggal jatuh tempo nota
  status_konsinyasi character varying DEFAULT 'Berjalan', 
  status_pembayaran character varying DEFAULT 'Belum Lunas',
  total_tagihan integer DEFAULT 0,
  id_mitra uuid,
  id_pengguna uuid,
  CONSTRAINT nota_konsinyasi_pkey PRIMARY KEY (id_konsinyasi),
  CONSTRAINT fk_konsinyasi_mitra FOREIGN KEY (id_mitra) REFERENCES public.mitra_toko(id_mitra) ON DELETE RESTRICT,
  CONSTRAINT fk_konsinyasi_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna(id_pengguna) ON DELETE RESTRICT
);

-- 15. Tabel Detail Konsinyasi
CREATE TABLE public.detail_konsinyasi (
  id_detail_kns uuid NOT NULL DEFAULT gen_random_uuid(),
  id_konsinyasi character varying NOT NULL,
  id_produk uuid NOT NULL,
  jumlah_titip integer NOT NULL CHECK (jumlah_titip > 0),
  jumlah_laku integer DEFAULT 0 CHECK (jumlah_laku >= 0),
  jumlah_retur_bagus integer DEFAULT 0 CHECK (jumlah_retur_bagus >= 0), 
  jumlah_retur_rusak integer DEFAULT 0 CHECK (jumlah_retur_rusak >= 0),
  subtotal integer DEFAULT 0,
  CONSTRAINT detail_konsinyasi_pkey PRIMARY KEY (id_detail_kns),
  CONSTRAINT fk_detail_kns_nota FOREIGN KEY (id_konsinyasi) REFERENCES public.nota_konsinyasi(id_konsinyasi) ON DELETE CASCADE,
  CONSTRAINT fk_detail_kns_produk FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE RESTRICT,
  CONSTRAINT cek_logika_retur_konsinyasi CHECK ((jumlah_laku + jumlah_retur_bagus + jumlah_retur_rusak) <= jumlah_titip) 
);

-- 16. Tabel Pembayaran / Cicilan Konsinyasi (Baru dari V2)
CREATE TABLE public.pembayaran_konsinyasi (
  id_pembayaran uuid NOT NULL DEFAULT gen_random_uuid(),
  id_konsinyasi character varying NOT NULL,
  nominal integer NOT NULL CHECK (nominal > 0),
  tanggal timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  id_pengguna uuid,
  CONSTRAINT pembayaran_konsinyasi_pkey PRIMARY KEY (id_pembayaran),
  CONSTRAINT fk_bayar_kns_nota FOREIGN KEY (id_konsinyasi) REFERENCES public.nota_konsinyasi(id_konsinyasi) ON DELETE CASCADE,
  CONSTRAINT fk_bayar_kns_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna(id_pengguna) ON DELETE RESTRICT
);

-- 17. Tabel Aktivitas Konsinyasi (Log Jejak Riwayat Pengecekan)
CREATE TABLE public.aktivitas_konsinyasi (
  id_aktivitas uuid NOT NULL DEFAULT gen_random_uuid(),
  id_konsinyasi character varying NOT NULL,
  tanggal timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  jenis character varying NOT NULL DEFAULT 'Catatan', 
  keterangan text,
  id_pengguna uuid,
  CONSTRAINT aktivitas_konsinyasi_pkey PRIMARY KEY (id_aktivitas),
  CONSTRAINT fk_aktivitas_nota FOREIGN KEY (id_konsinyasi) REFERENCES public.nota_konsinyasi(id_konsinyasi) ON DELETE CASCADE,
  CONSTRAINT fk_aktivitas_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna(id_pengguna) ON DELETE RESTRICT
);

-- 18. Tabel Penyesuaian Stok (Stock Opname)
CREATE TABLE public.penyesuaian_stok (
  id_penyesuaian uuid NOT NULL DEFAULT gen_random_uuid(),
  tanggal timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  id_produk uuid NOT NULL,
  stok_sistem integer NOT NULL DEFAULT 0,
  stok_fisik integer NOT NULL,
  selisih integer NOT NULL DEFAULT 0, 
  keterangan text NOT NULL, 
  id_pengguna uuid,
  CONSTRAINT penyesuaian_stok_pkey PRIMARY KEY (id_penyesuaian),
  CONSTRAINT fk_penyesuaian_produk FOREIGN KEY (id_produk) REFERENCES public.produk(id_produk) ON DELETE RESTRICT,
  CONSTRAINT fk_penyesuaian_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.pengguna(id_pengguna) ON DELETE RESTRICT
);


-- ==============================================================================
-- BAGIAN 3: INDEXING & UNIK AKTIF (OPTIMASI PERFORMA & KONTROL DATA)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_batch_bb_aktif ON public.batch_bahan_baku(id_bahan) WHERE stok_sisa > 0;
CREATE INDEX IF NOT EXISTS idx_batch_produk_aktif ON public.batch_produk(id_produk) WHERE stok_sisa > 0;
CREATE INDEX IF NOT EXISTS idx_aktivitas_konsinyasi_nota ON public.aktivitas_konsinyasi(id_konsinyasi);

-- Index tambahan untuk filter tanggal & performa dashboard
CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON public.transaksi_penjualan(tanggal_transaksi);
CREATE INDEX IF NOT EXISTS idx_transaksi_status ON public.transaksi_penjualan(status_transaksi);
CREATE INDEX IF NOT EXISTS idx_detail_transaksi_produk ON public.detail_transaksi(id_produk);
CREATE INDEX IF NOT EXISTS idx_detail_transaksi_nota ON public.detail_transaksi(id_transaksi);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_tanggal ON public.pengeluaran_toko(tanggal);
CREATE INDEX IF NOT EXISTS idx_nota_tanggal ON public.nota_konsinyasi(tanggal_titip);
CREATE INDEX IF NOT EXISTS idx_nota_jatuh_tempo ON public.nota_konsinyasi(jatuh_tempo);
CREATE INDEX IF NOT EXISTS idx_bayar_kns_nota ON public.pembayaran_konsinyasi(id_konsinyasi);
CREATE INDEX IF NOT EXISTS idx_riwayat_beli_tanggal ON public.riwayat_beli_bahan(tanggal_beli);
CREATE INDEX IF NOT EXISTS idx_riwayat_produksi_tanggal ON public.riwayat_produksi(tanggal_produksi);
CREATE INDEX IF NOT EXISTS idx_opname_tanggal ON public.penyesuaian_stok(tanggal);

-- Unique index untuk data aktif agar tidak duplikat
CREATE UNIQUE INDEX IF NOT EXISTS uq_produk_nama_aktif ON public.produk(nama_produk) WHERE is_deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bahan_nama_aktif ON public.bahan_baku(nama_bahan) WHERE is_deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_produk_sku ON public.produk(sku) WHERE sku IS NOT NULL AND sku <> '';


-- ==============================================================================
-- BAGIAN 4: VIEW UNTUK WAC REAL-TIME
-- ==============================================================================
CREATE OR REPLACE VIEW public.view_modal_produk AS
SELECT 
  p.id_produk,
  p.nama_produk,
  COALESCE(SUM(b.harga_rata_rata * r.jumlah_terpakai), 0) AS modal_hpp_aktual
FROM public.produk p
LEFT JOIN public.resep_produk r ON p.id_produk = r.id_produk
LEFT JOIN public.bahan_baku b ON r.id_bahan = b.id_bahan
WHERE p.is_deleted = false AND (b.is_deleted = false OR b.id_bahan IS NULL)
GROUP BY p.id_produk, p.nama_produk;


-- ==============================================================================
-- BAGIAN 5: TRIGGERS & OTOMATISASI (ERP STANDARDS)
-- (BAGIAN ini aman di-rerun: fungsi pakai CREATE OR REPLACE, trigger di-DROP dulu)
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_beli_bahan_baku ON public.riwayat_beli_bahan;
DROP TRIGGER IF EXISTS trg_proses_produksi ON public.riwayat_produksi;
DROP TRIGGER IF EXISTS trg_set_historis ON public.detail_transaksi;
DROP TRIGGER IF EXISTS trg_kurangi_stok_kasir ON public.detail_transaksi;
DROP TRIGGER IF EXISTS trg_batal_transaksi ON public.transaksi_penjualan;
DROP TRIGGER IF EXISTS trg_potong_stok_titip ON public.detail_konsinyasi;
DROP TRIGGER IF EXISTS trg_retur_konsinyasi ON public.nota_konsinyasi;
DROP TRIGGER IF EXISTS trg_bayar_konsinyasi ON public.pembayaran_konsinyasi;
DROP TRIGGER IF EXISTS trg_penyesuaian_stok ON public.penyesuaian_stok;

-- A. WAC Cerdas Pembelian (Bayar Hutang Minus Stok)
CREATE OR REPLACE FUNCTION proses_beli_bahan_baku() RETURNS TRIGGER AS $$
DECLARE
  v_stok_lama NUMERIC;
  v_harga_lama NUMERIC;
  v_stok_baru NUMERIC;
  v_harga_rata_rata NUMERIC;
  v_qty_masuk_batch NUMERIC;
BEGIN
  SELECT stok_bahan, harga_rata_rata INTO v_stok_lama, v_harga_lama FROM public.bahan_baku WHERE id_bahan = NEW.id_bahan;

  v_stok_baru := v_stok_lama + NEW.jumlah_beli;
  v_qty_masuk_batch := NEW.jumlah_beli; 

  IF v_stok_lama < 0 THEN
    v_qty_masuk_batch := NEW.jumlah_beli + v_stok_lama; 
    IF v_qty_masuk_batch < 0 THEN v_qty_masuk_batch := 0; END IF;
  END IF;

  IF v_stok_lama <= 0 THEN
    v_harga_rata_rata := NEW.total_biaya / NEW.jumlah_beli;
  ELSE
    v_harga_rata_rata := ((v_stok_lama * v_harga_lama) + NEW.total_biaya) / v_stok_baru;
  END IF;

  UPDATE public.bahan_baku SET stok_bahan = v_stok_baru, harga_rata_rata = v_harga_rata_rata WHERE id_bahan = NEW.id_bahan;

  IF v_qty_masuk_batch > 0 THEN
    INSERT INTO public.batch_bahan_baku (id_bahan, stok_sisa, tanggal_kadaluarsa)
    VALUES (NEW.id_bahan, v_qty_masuk_batch, NEW.tanggal_kadaluarsa);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_beli_bahan_baku AFTER INSERT ON public.riwayat_beli_bahan FOR EACH ROW EXECUTE FUNCTION proses_beli_bahan_baku();


-- B. Proses Produksi (Kunci HPP & FOR UPDATE FIFO)
CREATE OR REPLACE FUNCTION proses_produksi() RETURNS TRIGGER AS $$
DECLARE
  resep RECORD;
  batch_bb RECORD;
  v_sisa_potong NUMERIC;
  v_stok_lama_produk INT;
  v_qty_masuk_batch INT;
  v_hpp_produksi INT := 0;
BEGIN
  SELECT COALESCE(SUM(b.harga_rata_rata * r.jumlah_terpakai), 0) INTO v_hpp_produksi
  FROM public.resep_produk r JOIN public.bahan_baku b ON r.id_bahan = b.id_bahan WHERE r.id_produk = NEW.id_produk;

  SELECT stok INTO v_stok_lama_produk FROM public.produk WHERE id_produk = NEW.id_produk;
  v_qty_masuk_batch := NEW.jumlah_produksi;
  
  IF v_stok_lama_produk < 0 THEN
    v_qty_masuk_batch := NEW.jumlah_produksi + v_stok_lama_produk;
    IF v_qty_masuk_batch < 0 THEN v_qty_masuk_batch := 0; END IF;
  END IF;

  UPDATE public.produk SET stok = stok + NEW.jumlah_produksi WHERE id_produk = NEW.id_produk;
  
  IF v_qty_masuk_batch > 0 THEN
    INSERT INTO public.batch_produk (id_produk, stok_sisa, hpp_produksi, tanggal_kadaluarsa)
    VALUES (NEW.id_produk, v_qty_masuk_batch, v_hpp_produksi, NEW.tanggal_kadaluarsa);
  END IF;
  
  FOR resep IN SELECT id_bahan, jumlah_terpakai FROM public.resep_produk WHERE id_produk = NEW.id_produk
  LOOP
    v_sisa_potong := resep.jumlah_terpakai * NEW.jumlah_produksi;
    UPDATE public.bahan_baku SET stok_bahan = stok_bahan - v_sisa_potong WHERE id_bahan = resep.id_bahan;

    FOR batch_bb IN 
      SELECT id_batch_bahan, stok_sisa FROM public.batch_bahan_baku
      WHERE id_bahan = resep.id_bahan AND stok_sisa > 0
      ORDER BY tanggal_kadaluarsa ASC NULLS FIRST, tanggal_masuk ASC FOR UPDATE
    LOOP
      IF v_sisa_potong <= 0 THEN EXIT; END IF;
      IF batch_bb.stok_sisa >= v_sisa_potong THEN
        UPDATE public.batch_bahan_baku SET stok_sisa = stok_sisa - v_sisa_potong WHERE id_batch_bahan = batch_bb.id_batch_bahan;
        v_sisa_potong := 0;
      ELSE
        UPDATE public.batch_bahan_baku SET stok_sisa = 0 WHERE id_batch_bahan = batch_bb.id_batch_bahan;
        v_sisa_potong := v_sisa_potong - batch_bb.stok_sisa;
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_proses_produksi AFTER INSERT ON public.riwayat_produksi FOR EACH ROW EXECUTE FUNCTION proses_produksi();


-- C. Set Historis Transaksi (Initial/Fallback Data BEFORE INSERT)
CREATE OR REPLACE FUNCTION set_historis_transaksi() RETURNS TRIGGER AS $$
DECLARE
  v_harga_jual INT;
  v_hpp INT;
  v_is_deleted BOOLEAN;
BEGIN
  SELECT is_deleted, harga_jual INTO v_is_deleted, v_harga_jual FROM public.produk WHERE id_produk = NEW.id_produk;
  IF v_is_deleted THEN RAISE EXCEPTION 'Produk ini sudah dihapus dan tidak bisa dijual!'; END IF;
  
  SELECT modal_hpp_aktual INTO v_hpp FROM public.view_modal_produk WHERE id_produk = NEW.id_produk; 

  NEW.harga_jual_satuan := COALESCE(v_harga_jual, 0);
  NEW.hpp_satuan := COALESCE(v_hpp, 0);
  IF NEW.subtotal IS NULL OR NEW.subtotal = 0 THEN NEW.subtotal := NEW.jumlah_beli * NEW.harga_jual_satuan; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_historis BEFORE INSERT ON public.detail_transaksi FOR EACH ROW EXECUTE FUNCTION set_historis_transaksi();


-- D. Kurangi Stok & Hitung HPP Lintas Batch (THE BLENDED HPP FIX!)
CREATE OR REPLACE FUNCTION kurangi_stok_penjualan() RETURNS TRIGGER AS $$
DECLARE
  batch_rec RECORD;
  v_sisa_potong INT := NEW.jumlah_beli;
  v_potong_sekarang INT;
  v_total_hpp_campuran INT := 0;
  v_hpp_fallback INT;
BEGIN
  UPDATE public.produk SET stok = stok - NEW.jumlah_beli WHERE id_produk = NEW.id_produk;

  FOR batch_rec IN  
    SELECT id_batch_produk, stok_sisa, hpp_produksi FROM public.batch_produk  
    WHERE id_produk = NEW.id_produk AND stok_sisa > 0  
    ORDER BY tanggal_kadaluarsa ASC NULLS FIRST, tanggal_produksi ASC FOR UPDATE
  LOOP
    IF v_sisa_potong <= 0 THEN EXIT; END IF;
    
    IF batch_rec.stok_sisa >= v_sisa_potong THEN
      v_potong_sekarang := v_sisa_potong;
    ELSE
      v_potong_sekarang := batch_rec.stok_sisa;
    END IF;

    UPDATE public.batch_produk SET stok_sisa = stok_sisa - v_potong_sekarang WHERE id_batch_produk = batch_rec.id_batch_produk;
    v_total_hpp_campuran := v_total_hpp_campuran + (v_potong_sekarang * batch_rec.hpp_produksi);
    v_sisa_potong := v_sisa_potong - v_potong_sekarang;
  END LOOP;

  IF v_sisa_potong > 0 THEN
    SELECT modal_hpp_aktual INTO v_hpp_fallback FROM public.view_modal_produk WHERE id_produk = NEW.id_produk;
    v_total_hpp_campuran := v_total_hpp_campuran + (v_sisa_potong * COALESCE(v_hpp_fallback, 0));
  END IF;

  UPDATE public.detail_transaksi 
  SET hpp_satuan = (v_total_hpp_campuran / NEW.jumlah_beli) 
  WHERE id_detail = NEW.id_detail;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_kurangi_stok_kasir AFTER INSERT ON public.detail_transaksi FOR EACH ROW EXECUTE FUNCTION kurangi_stok_penjualan();


-- E. Batal Transaksi
CREATE OR REPLACE FUNCTION kembalikan_stok_batal_transaksi() RETURNS TRIGGER AS $$
DECLARE
  detail_rec RECORD;
BEGIN
  IF NEW.status_transaksi = 'Dibatalkan' AND OLD.status_transaksi != 'Dibatalkan' THEN
    NEW.waktu_diubah := CURRENT_TIMESTAMP;
    FOR detail_rec IN SELECT id_produk, jumlah_beli, hpp_satuan FROM public.detail_transaksi WHERE id_transaksi = NEW.id_transaksi
    LOOP
      UPDATE public.produk SET stok = stok + detail_rec.jumlah_beli WHERE id_produk = detail_rec.id_produk;
      INSERT INTO public.batch_produk (id_produk, stok_sisa, hpp_produksi, tanggal_kadaluarsa)
      VALUES (detail_rec.id_produk, detail_rec.jumlah_beli, detail_rec.hpp_satuan, NULL);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_batal_transaksi BEFORE UPDATE ON public.transaksi_penjualan FOR EACH ROW EXECUTE FUNCTION kembalikan_stok_batal_transaksi();


-- F. Potong Stok Konsinyasi (FOR UPDATE FIFO)
CREATE OR REPLACE FUNCTION potong_stok_titip() RETURNS TRIGGER AS $$
DECLARE
  batch_rec RECORD;
  v_sisa_potong INT := NEW.jumlah_titip;
BEGIN
  UPDATE public.produk SET stok = stok - NEW.jumlah_titip WHERE id_produk = NEW.id_produk;
  FOR batch_rec IN 
    SELECT id_batch_produk, stok_sisa FROM public.batch_produk WHERE id_produk = NEW.id_produk AND stok_sisa > 0 
    ORDER BY tanggal_kadaluarsa ASC NULLS FIRST, tanggal_produksi ASC FOR UPDATE
  LOOP
    IF v_sisa_potong <= 0 THEN EXIT; END IF;
    IF batch_rec.stok_sisa >= v_sisa_potong THEN
      UPDATE public.batch_produk SET stok_sisa = stok_sisa - v_sisa_potong WHERE id_batch_produk = batch_rec.id_batch_produk;
      v_sisa_potong := 0;
    ELSE
      UPDATE public.batch_produk SET stok_sisa = 0 WHERE id_batch_produk = batch_rec.id_batch_produk;
      v_sisa_potong := v_sisa_potong - batch_rec.stok_sisa;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_potong_stok_titip AFTER INSERT ON public.detail_konsinyasi FOR EACH ROW EXECUTE FUNCTION potong_stok_titip();


-- G. Retur Konsinyasi (saat nota diselesaikan)
-- Retur bagus kembali ke stok + batch, retur rusak jadi beban, DAN sisa titipan
-- yang belum dijelaskan (titip - laku - retur bagus - retur rusak) ikut kembali
-- agar tidak nyangkut (mis. mitra mengembalikan semua tanpa catat rinci).
CREATE OR REPLACE FUNCTION tarik_retur_konsinyasi() RETURNS TRIGGER AS $$
DECLARE
  detail_rec RECORD;
  v_hpp INT;
  v_rugi INT;
  v_sisa INT;
  v_kembali INT;
  v_nama TEXT;
BEGIN
  IF NEW.status_konsinyasi = 'Selesai' AND OLD.status_konsinyasi != 'Selesai' THEN
    FOR detail_rec IN
      SELECT id_produk, jumlah_titip, jumlah_laku, jumlah_retur_bagus, jumlah_retur_rusak
      FROM public.detail_konsinyasi WHERE id_konsinyasi = NEW.id_konsinyasi
    LOOP
      SELECT hpp_produksi INTO v_hpp FROM public.batch_produk WHERE id_produk = detail_rec.id_produk AND stok_sisa > 0 ORDER BY tanggal_kadaluarsa ASC NULLS FIRST, tanggal_produksi ASC LIMIT 1;
      IF v_hpp IS NULL THEN SELECT modal_hpp_aktual INTO v_hpp FROM public.view_modal_produk WHERE id_produk = detail_rec.id_produk; END IF;
      SELECT nama_produk INTO v_nama FROM public.produk WHERE id_produk = detail_rec.id_produk;
      
      -- sisa titipan yang belum dijelaskan ikut kembali ke stok
      v_sisa := COALESCE(detail_rec.jumlah_titip, 0) - COALESCE(detail_rec.jumlah_laku, 0)
              - COALESCE(detail_rec.jumlah_retur_bagus, 0) - COALESCE(detail_rec.jumlah_retur_rusak, 0);
      IF v_sisa < 0 THEN v_sisa := 0; END IF;
      v_kembali := COALESCE(detail_rec.jumlah_retur_bagus, 0) + v_sisa;

      IF v_kembali > 0 THEN
        UPDATE public.produk SET stok = stok + v_kembali WHERE id_produk = detail_rec.id_produk;
        INSERT INTO public.batch_produk (id_produk, stok_sisa, hpp_produksi, tanggal_kadaluarsa) 
        VALUES (detail_rec.id_produk, v_kembali, COALESCE(v_hpp,0), NULL);
      END IF;

      IF detail_rec.jumlah_retur_rusak > 0 THEN
        v_rugi := detail_rec.jumlah_retur_rusak * COALESCE(v_hpp, 0);
        IF v_rugi > 0 THEN
          INSERT INTO public.pengeluaran_toko (keterangan, nominal, id_pengguna, kategori)
          VALUES ('Rugi Konsinyasi Rusak (' || detail_rec.jumlah_retur_rusak || ' pcs) - ' || COALESCE(v_nama, detail_rec.id_produk::text), v_rugi, NEW.id_pengguna, 'Kerugian / Rusak');
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_retur_konsinyasi AFTER UPDATE ON public.nota_konsinyasi FOR EACH ROW EXECUTE FUNCTION tarik_retur_konsinyasi();


-- H. Otomatisasi Cicilan Pembayaran Konsinyasi Menjadi Lunas
CREATE OR REPLACE FUNCTION proses_bayar_konsinyasi() RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_bayar INTEGER;
BEGIN
  SELECT total_tagihan INTO v_total FROM public.nota_konsinyasi WHERE id_konsinyasi = NEW.id_konsinyasi;
  SELECT COALESCE(SUM(nominal), 0) INTO v_bayar FROM public.pembayaran_konsinyasi WHERE id_konsinyasi = NEW.id_konsinyasi;
  
  IF v_bayar >= COALESCE(v_total, 0) AND COALESCE(v_total, 0) > 0 THEN
    UPDATE public.nota_konsinyasi SET status_pembayaran = 'Lunas' WHERE id_konsinyasi = NEW.id_konsinyasi;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_bayar_konsinyasi AFTER INSERT ON public.pembayaran_konsinyasi FOR EACH ROW EXECUTE FUNCTION proses_bayar_konsinyasi();


-- I. PENYESUAIAN STOK / OPNAME
CREATE OR REPLACE FUNCTION proses_penyesuaian_stok() RETURNS TRIGGER AS $$
DECLARE
  v_rugi INT;
  v_hpp INT;
  v_sisa_potong INT;
  v_kat TEXT;
  v_nama TEXT;
  batch_rec RECORD;
BEGIN
  SELECT stok INTO NEW.stok_sistem FROM public.produk WHERE id_produk = NEW.id_produk;
  NEW.selisih := NEW.stok_fisik - NEW.stok_sistem;
  UPDATE public.produk SET stok = NEW.stok_fisik WHERE id_produk = NEW.id_produk;
  
  IF NEW.selisih < 0 THEN
    v_sisa_potong := ABS(NEW.selisih);
    SELECT hpp_produksi INTO v_hpp FROM public.batch_produk WHERE id_produk = NEW.id_produk AND stok_sisa > 0 ORDER BY tanggal_kadaluarsa ASC NULLS FIRST, tanggal_produksi ASC LIMIT 1;
    IF v_hpp IS NULL THEN SELECT modal_hpp_aktual INTO v_hpp FROM public.view_modal_produk WHERE id_produk = NEW.id_produk; END IF;
    
    SELECT nama_produk INTO v_nama FROM public.produk WHERE id_produk = NEW.id_produk;
    v_rugi := v_sisa_potong * COALESCE(v_hpp, 0);
    IF v_rugi > 0 THEN
      -- Kategori mengikuti awalan keterangan dari aplikasi (Rusak:/Kadaluarsa:),
      -- default-nya opname/hilang biasa.
      IF NEW.keterangan ILIKE 'rusak:%' OR NEW.keterangan ILIKE 'kadaluarsa:%' THEN
        v_kat := 'Kerugian / Rusak';
      ELSE
        v_kat := 'Stock Opname / Hilang';
      END IF;
      INSERT INTO public.pengeluaran_toko (keterangan, nominal, id_pengguna, kategori)
      VALUES ('Opname/Hilang (' || v_sisa_potong || ' pcs) - ' || NEW.keterangan || ' - ' || COALESCE(v_nama, NEW.id_produk::text), v_rugi, NEW.id_pengguna, v_kat);
    END IF;

    FOR batch_rec IN SELECT id_batch_produk, stok_sisa FROM public.batch_produk WHERE id_produk = NEW.id_produk AND stok_sisa > 0 ORDER BY tanggal_kadaluarsa ASC NULLS FIRST, tanggal_produksi ASC FOR UPDATE
    LOOP
       IF v_sisa_potong <= 0 THEN EXIT; END IF;
       IF batch_rec.stok_sisa >= v_sisa_potong THEN
         UPDATE public.batch_produk SET stok_sisa = stok_sisa - v_sisa_potong WHERE id_batch_produk = batch_rec.id_batch_produk;
         v_sisa_potong := 0;
       ELSE
         UPDATE public.batch_produk SET stok_sisa = 0 WHERE id_batch_produk = batch_rec.id_batch_produk;
         v_sisa_potong := v_sisa_potong - batch_rec.stok_sisa;
       END IF;
    END LOOP;
  ELSIF NEW.selisih > 0 THEN
    SELECT modal_hpp_aktual INTO v_hpp FROM public.view_modal_produk WHERE id_produk = NEW.id_produk;
    INSERT INTO public.batch_produk (id_produk, stok_sisa, hpp_produksi, tanggal_kadaluarsa)
    VALUES (NEW.id_produk, NEW.selisih, COALESCE(v_hpp, 0), NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_penyesuaian_stok BEFORE INSERT ON public.penyesuaian_stok FOR EACH ROW EXECUTE FUNCTION proses_penyesuaian_stok();


-- ==============================================================================
-- BAGIAN 6: KEAMANAN (ROW LEVEL SECURITY - RLS) & STORAGE BUCKET
-- (BAGIAN ini aman di-rerun: policy lama di-DROP dulu)
-- ==============================================================================
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.pengguna;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.bahan_baku;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.batch_bahan_baku;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.supplier;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.riwayat_beli_bahan;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.produk;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.batch_produk;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.resep_produk;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.riwayat_produksi;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.transaksi_penjualan;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.detail_transaksi;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.pengeluaran_toko;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.mitra_toko;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.nota_konsinyasi;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.detail_konsinyasi;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.pembayaran_konsinyasi;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.aktivitas_konsinyasi;
DROP POLICY IF EXISTS "Akses Khusus Login" ON public.penyesuaian_stok;
DROP POLICY IF EXISTS "Foto publik bisa dibaca" ON storage.objects;
DROP POLICY IF EXISTS "Login bisa upload foto" ON storage.objects;
DROP POLICY IF EXISTS "Login bisa hapus foto" ON storage.objects;
ALTER TABLE public.pengguna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bahan_baku ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_bahan_baku ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_beli_bahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resep_produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_produksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran_toko ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitra_toko ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nota_konsinyasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_konsinyasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembayaran_konsinyasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aktivitas_konsinyasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penyesuaian_stok ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses Khusus Login" ON public.pengguna FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.bahan_baku FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.batch_bahan_baku FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.supplier FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.riwayat_beli_bahan FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.produk FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.batch_produk FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.resep_produk FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.riwayat_produksi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.transaksi_penjualan FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.detail_transaksi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.pengeluaran_toko FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.mitra_toko FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.nota_konsinyasi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.detail_konsinyasi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.pembayaran_konsinyasi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.aktivitas_konsinyasi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Akses Khusus Login" ON public.penyesuaian_stok FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Konfigurasi Supabase Storage untuk Foto Produk
INSERT INTO storage.buckets (id, name, public)
VALUES ('foto-produk', 'foto-produk', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Foto publik bisa dibaca"
ON storage.objects FOR SELECT USING (bucket_id = 'foto-produk');

CREATE POLICY "Login bisa upload foto"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'foto-produk');

CREATE POLICY "Login bisa hapus foto"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'foto-produk');

-- ==============================================================================
-- BAGIAN 7 (opsional, SEKALI JALAN setelah BAGIAN 5 — aman diulang):
-- Ganti ID produk di keterangan pengeluaran LAMA menjadi nama produk agar
-- mudah dibaca. Hanya menyentuh baris yang masih berformat "... - ID: <uuid>".
-- ==============================================================================
UPDATE public.pengeluaran_toko p
SET keterangan = regexp_replace(
  p.keterangan,
  ' - ID: [0-9a-fA-F-]{36}$',
  ' - ' || pr.nama_produk
)
FROM public.produk pr
WHERE p.keterangan ~ ' - ID: [0-9a-fA-F-]{36}$'
  AND pr.id_produk = (regexp_match(p.keterangan, ' - ID: ([0-9a-fA-F-]{36})$'))[1]::uuid;

-- ==============================================================================
-- BAGIAN 8: REGISTRASI MANDIRI PENGGUNA (aman di-rerun)
-- Alur: staf daftar di halaman /register → baris "menunggu persetujuan" →
-- admin acc + pilih peran di menu Pengguna. Login menolak yang belum disetujui.
-- - Baris LAMA otomatis dianggap disetujui (DEFAULT true) agar akun yang sudah
--   jalan tidak terkunci.
-- - Password boleh kosong (login resmi via Supabase Auth; kolom password hanya
--   warisan kompatibilitas).
-- - Anon (belum login) HANYA boleh INSERT pendaftar menunggu persetujuan —
--   peran & status dikunci di policy, jadi pendaftar tidak bisa mengangkat
--   dirinya jadi Admin.
-- ==============================================================================
ALTER TABLE public.pengguna ADD COLUMN IF NOT EXISTS email character varying UNIQUE;
ALTER TABLE public.pengguna ADD COLUMN IF NOT EXISTS is_disetujui boolean DEFAULT true;
ALTER TABLE public.pengguna ALTER COLUMN password DROP NOT NULL;
DROP POLICY IF EXISTS "Registrasi mandiri" ON public.pengguna;
CREATE POLICY "Registrasi mandiri" ON public.pengguna FOR INSERT TO anon
  WITH CHECK (role_akses = 'Kasir' AND is_disetujui = false AND is_deleted = false);