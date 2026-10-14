"use client";

// Input uang bertitik otomatis: ketik 50000 → tampil 50.000.
// value = string digit mentah ("50000"), onChange menerima string digit mentah.
// Pakai untuk SEMUA input rupiah agar konsisten (kasir, pengeluaran, pembelian, harga produk).
export default function RupiahInput({
  value,
  onChange,
  disabled,
  placeholder,
  className = "",
  autoFocus,
}) {
  const raw = value ?? "";
  const display = raw === "" ? "" : Number(raw).toLocaleString("id-ID");
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      disabled={disabled}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
        onChange(digits);
      }}
      className={className}
    />
  );
}
