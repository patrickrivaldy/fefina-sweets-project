export function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatTanggal(dateValue, withTime = false) {
  if (!dateValue) return "-";
  try {
    return new Date(dateValue).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime
        ? { hour: "2-digit", minute: "2-digit" }
        : {}),
    });
  } catch {
    return "-";
  }
}

export function generateIdTransaksi() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRX-${date}-${rand}`;
}

export function randomId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fallback di bawah */ }
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function generateIdKonsinyasi() {
  return `KNS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
}

export function todayISO() {
  // LEGACY (UTC) — jangan pakai untuk batas hari. Pakai todayWIB().
  return new Date().toISOString().split("T")[0];
}

const WIB_MS = 7 * 60 * 60 * 1000;

// Tanggal hari ini dalam WIB (untuk default input date & label "hari ini").
export function todayWIB() {
  return new Date(Date.now() + WIB_MS).toISOString().split("T")[0];
}

// Timestamp DB (UTC) → kunci tanggal YYYY-MM-DD dalam WIB (untuk grup grafik/filter).
export function wibKey(dateValue) {
  if (!dateValue) return "";
  return new Date(new Date(dateValue).getTime() + WIB_MS).toISOString().split("T")[0];
}

// Kunci bulan YYYY-MM dalam WIB.
export function wibMonth(dateValue) {
  return wibKey(dateValue).slice(0, 7);
}

// Nilai input date (YYYY-MM-DD, dianggap WIB) → ISO UTC untuk disimpan ke DB.
// Menggantikan hack T08:00:00 yang rapuh.
export function wibDateTime(isoDate, time = "00:00:00") {
  if (!isoDate) return new Date().toISOString();
  return new Date(`${isoDate}T${time}+07:00`).toISOString();
}

// Rentang 1 hari WIB (YYYY-MM-DD) → batas UTC {gte, lte} untuk query Supabase.
export function wibDayBounds(isoDate) {
  return {
    gte: new Date(`${isoDate}T00:00:00+07:00`).toISOString(),
    lte: new Date(`${isoDate}T23:59:59.999+07:00`).toISOString(),
  };
}

// Stok/takaran (bisa desimal dari WAC & konversi): tampil max 2 desimal.
// WAC pecahan itu BENAR (misal 50000/3), yang dirapikan cuma tampilannya.
export function formatStok(nilai) {
  const n = Number(nilai);
  if (!isFinite(n)) return "0";
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

// Terjemahkan error database mentah jadi bahasa manusia.
// Dipakai di SEMUA catch setelah tulis ke Supabase.
export function pesanErrorDb(msg) {
  const raw = msg || "Gagal menyimpan.";
  if (/pengeluaran_toko_nominal_check/i.test(raw))
    return "Rugi Rp 0 ditolak database (HPP produk Rp 0 — resep belum benar). Betulkan resep/HPP dulu, atau jalankan ulang db-draft.md BAGIAN 5 (guard rugi Rp 0).";
  if (/cek_logika_retur_konsinyasi/i.test(raw))
    return "Laku + retur melebihi jumlah titip. Kurangi salah satunya.";
  if (/row-level security|policy/i.test(raw))
    return "Ditolak database (RLS/policy). Pastikan sudah login.";
  if (/duplicate|unique|already exists/i.test(raw))
    return "Data duplikat (nama/SKU/username sudah dipakai).";
  if (/bucket not found/i.test(raw))
    return "Bucket foto 'foto-produk' belum dibuat di Supabase (Storage).";
  return raw;
}
// Selalu tampil dua arah (gram↔kg, ml↔liter) agar kebiasaan gram tetap kebaca kg-nya.
// Dipakai di samping input takaran/jumlah. Kembalikan "" bila tak perlu.
export function formatKonversi(nilai, satuan) {
  const n = Number(nilai);
  if (!n || n <= 0 || !satuan) return "";
  const s = String(satuan).trim().toLowerCase();
  const f = (x) => x.toLocaleString("id-ID", { maximumFractionDigits: 3 });
  if (s === "gram" || s === "g") return `= ${f(n / 1000)} kg`;
  if (s === "kilogram" || s === "kg") return `= ${f(n * 1000)} gram`;
  if (s === "ml") return `= ${f(n / 1000)} liter`;
  if (s === "liter" || s === "l") return `= ${f(n * 1000)} ml`;
  return "";
}
<<<<<<< HEAD
=======

// Konversi OTOMATIS untuk TAMPILAN saja (input & database tetap satuan dasar):
// gram ≥ 1000 → kg, ml ≥ 1000 → liter, sebaliknya kg/liter di bawah 1 → gram/ml.
// Satuan lain (pcs, pack, sachet, butir, ...) tidak diubah.
// faktor = pengali harga satuan dasar agar cocok dengan satuan tampil
// (mis. Rp50/gram → tampil Rp50.000/kg bila stoknya tampil dalam kg).
export function konversiOtomatis(nilai, satuan) {
  const n = Number(nilai);
  const s = String(satuan || "").trim().toLowerCase();
  const a = Math.abs(n);
  if ((s === "gram" || s === "g") && a >= 1000) return { nilai: n / 1000, satuan: "kg", faktor: 1000 };
  if ((s === "kilogram" || s === "kg") && a > 0 && a < 1) return { nilai: n * 1000, satuan: "gram", faktor: 1 / 1000 };
  if (s === "ml" && a >= 1000) return { nilai: n / 1000, satuan: "liter", faktor: 1000 };
  if ((s === "liter" || s === "l") && a > 0 && a < 1) return { nilai: n * 1000, satuan: "ml", faktor: 1 / 1000 };
  return { nilai: n, satuan: satuan || "", faktor: 1 };
}

// "2500 gram" → "2,5 kg". Pengganti pola `{formatStok(n)} {satuan}` untuk tampilan.
export function formatSatuanOtomatis(nilai, satuan) {
  const n = Number(nilai);
  if (!isFinite(n)) return `0 ${satuan || ""}`.trim();
  const k = konversiOtomatis(n, satuan);
  return `${k.nilai.toLocaleString("id-ID", { maximumFractionDigits: 3 })} ${k.satuan}`.trim();
}
>>>>>>> abdc9f205773143f9080885b9c15d7e367fd4354
