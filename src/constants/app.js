// Nilai-nilai baku yang dipakai di banyak halaman.
// Ubah di sini kalau ada perubahan aturan bisnis — jangan ubah di tiap file.

// Batas stok: <= nilai ini dianggap menipis (dipakai Dashboard, Produk, Stok)
export const STOK_KRITIS = 5;

// Pilihan satuan bahan baku (bebas ketik sendiri; ini hanya saran tombol)
// Pakai gram/ml sebagai basis agar WAC konsisten — hindari kg/liter.
export const SATUAN_BAHAN = [
  "gram",
  "ons",
  "ml",
  "pcs",
  "pack",
  "sachet",
  "butir",
  "bungkus",
  "botol",
  "kaleng",
];

// Kategori pengeluaran — string HARUS sama dengan db-draft.md & trigger
// ('Kerugian / Rusak', 'Stock Opname / Hilang'). Kolom kategori ada di db-draft.md.
export const KATEGORI_PENGELUARAN = [
  "Operasional",
  "Sewa",
  "Listrik",
  "Gaji",
  "Bahan habis pakai",
  "Kerugian / Rusak",
  "Stock Opname / Hilang",
  "Lainnya",
];
// Info pembayaran non-tunai yang DITAMPILKAN ke pembeli (tidak tersambung ke bank/ewallet).
// Cara ganti: simpan gambar QRIS sebagai public/qris.png, lalu ubah norek di bawah.
export const PEMBAYARAN_INFO = {
  qrisImage: "/qris.png",
  qrisNama: "Fefina Sweets",
  bankNama: "BCA",
  bankNorek: "1234567890",
  bankPemilik: "Fefina Sweets",
};

// Status database (harus sama persis dengan nilai di db-draft.md)
export const STATUS_PEMBAYARAN = ["Belum Lunas", "Lunas"];
export const STATUS_KONSINYASI = ["Berjalan", "Selesai"];
export const STATUS_TRANSAKSI = {
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

// Batas jumlah baris yang diambil per query (melindungi dari tabel jutaan baris)
export const LIMITS = {
  riwayatBeli: 200,
  riwayatProduksi: 200,
  batchAktif: 300,
  transaksi: 300,
  opname: 300,
};
