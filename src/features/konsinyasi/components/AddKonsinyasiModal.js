"use client";

import { useRef, useState } from "react";
import { formatRupiah, todayWIB } from "@/utils/format";
import Select from "@/components/ui/Select";
import { X, Plus, Trash2, Check } from "lucide-react";

export default function AddKonsinyasiModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  resellers,
  products,
  fiturMigrasi = true,
}) {
  const [idMitra, setIdMitra] = useState("");
  const [tanggal, setTanggal] = useState(todayWIB());
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [lines, setLines] = useState([{ key: 1, id_produk: "", jumlah: "" }]);
  const [err, setErr] = useState("");
  const keyRef = useRef(2);

  if (!isOpen) return null;

  const prodOf = (id) => products.find((p) => p.id_produk === id);
  const usedIds = lines.map((l) => l.id_produk).filter(Boolean);

  const setLine = (key, patch) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addLine = () => {
    setLines((prev) => [...prev, { key: keyRef.current++, id_produk: "", jumlah: "" }]);
    setErr("");
  };

  const delLine = (key) =>
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));

  const validLines = lines.filter((l) => l.id_produk && Number(l.jumlah) > 0);
  const totalPcs = validLines.reduce((s, l) => s + (Number(l.jumlah) || 0), 0);
  const totalNilai = validLines.reduce(
    (s, l) => s + (Number(l.jumlah) || 0) * (prodOf(l.id_produk)?.harga_jual || 0),
    0
  );

  const reset = () => {
    setIdMitra("");
    setTanggal(todayWIB());
    setJatuhTempo("");
    setLines([{ key: keyRef.current++, id_produk: "", jumlah: "" }]);
    setErr("");
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!idMitra) return setErr("Pilih dulu tokonya.");
    if (!tanggal) return setErr("Isi tanggal titip.");
    const items = [];
    const seen = new Set();
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const p = prodOf(l.id_produk);
      if (!p) return setErr(`Baris ${i + 1}: pilih produknya.`);
      if (seen.has(l.id_produk)) return setErr(`Baris ${i + 1}: ${p.nama_produk} sudah ada di daftar. Gabungkan jumlahnya.`);
      seen.add(l.id_produk);
      const qty = Number(l.jumlah) || 0;
      if (qty <= 0) return setErr(`Baris ${i + 1}: jumlah harus lebih dari 0.`);
      if (qty > (p.stok || 0))
        return setErr(`Baris ${i + 1}: stok ${p.nama_produk} tinggal ${p.stok}, minta ${qty}.`);
      items.push({ id_produk: l.id_produk, jumlah_titip: qty });
    }
    if (!items.length) return setErr("Tambahkan minimal 1 produk.");
    try {
      await onSubmit({ id_mitra: idMitra, tanggal_titip: tanggal, jatuh_tempo: jatuhTempo || null, items });
      reset();
    } catch (e2) {
      setErr(e2.message || "Gagal menyimpan nota.");
    }
  };

  const input =
    "h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15 disabled:bg-slate-100";

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-950/45" onClick={close} />
      <aside className="nice-scroll absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold">Buat Nota Titip Baru</h2>
            <p className="text-xs text-slate-500">1 toko boleh titip banyak macam produk sekaligus.</p>
          </div>
          <button type="button" onClick={close} disabled={submitting} aria-label="Tutup" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="nice-scroll flex-1 space-y-4 overflow-y-auto p-5">
            {err && (
              <p className="rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{err}</p>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Select label="Toko / Reseller *" value={idMitra}
                onChange={(e) => { setIdMitra(e.target.value); setErr(""); }}
                disabled={submitting} placeholder="Pilih toko…">
                {resellers.map((r) => (
                  <option key={r.id_mitra} value={r.id_mitra}>{r.nama_toko}</option>
                ))}
              </Select>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold">Tanggal Titip *</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  disabled={submitting}
                  className={`${input} w-full`}
                />
              </div>
            </div>
            {fiturMigrasi && (
              <div>
                <label className="mb-1.5 block text-[13px] font-bold">Jatuh Tempo <span className="font-medium text-slate-400">(opsional, untuk reminder)</span></label>
                <input
                  type="date"
                  value={jatuhTempo}
                  onChange={(e) => setJatuhTempo(e.target.value)}
                  disabled={submitting}
                  className={`${input} w-full`}
                />
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-bold">Produk Dititip ({lines.length} macam)</p>
                <button
                  type="button"
                  onClick={addLine}
                  disabled={submitting || lines.length >= products.length}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                >
                  <Plus size={14} strokeWidth={2.5} /> Tambah Macam
                </button>
              </div>
              <div className="space-y-2.5">
                {lines.map((l, i) => {
                  const p = prodOf(l.id_produk);
                  const over = p && Number(l.jumlah) > (p.stok || 0);
                  return (
                    <div key={l.key} className={`rounded-xl p-3 ring-1 ${over ? "bg-red-50/50 ring-red-200" : "bg-[#eff4ff]/60 ring-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Select
                            value={l.id_produk}
                            onChange={(e) => setLine(l.key, { id_produk: e.target.value })}
                            disabled={submitting}
                            placeholder="Pilih produk…"
                          >
                            {products.map((pr) => (
                              <option
                                key={pr.id_produk}
                                value={pr.id_produk}
                                disabled={usedIds.includes(pr.id_produk) && pr.id_produk !== l.id_produk}
                              >
                                {pr.nama_produk} (stok {pr.stok})
                              </option>
                            ))}
                          </Select>
                        </div>
                        <button
                          type="button"
                          onClick={() => delLine(l.key)}
                          disabled={submitting || lines.length <= 1}
                          aria-label="Hapus baris"
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="flex h-11 flex-1 items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-emerald-600/25">
                          <span className="text-xs text-slate-400">Jumlah</span>
                          <input
                            type="number"
                            min="1"
                            value={l.jumlah}
                            onChange={(e) => setLine(l.key, { jumlah: e.target.value })}
                            disabled={submitting || !l.id_produk}
                            placeholder="10"
                            className="tnum w-full bg-transparent text-right text-sm font-bold outline-none"
                          />
                          <span className="text-xs text-slate-400">pcs</span>
                        </label>
                        {p && (
                          <span className={`tnum whitespace-nowrap text-xs font-bold ${over ? "text-red-600" : "text-slate-500"}`}>
                            Stok {p.stok}
                          </span>
                        )}
                      </div>
                      {over && (
                        <p className="mt-1.5 text-[11px] font-bold text-red-600">
                          Melebihi stok! Maksimal {p.stok} pcs.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50/70 p-3.5 ring-1 ring-emerald-100">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Rincian per varian</p>
              {validLines.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada baris valid — pilih produk + jumlah di atas.</p>
              ) : (
                <ul className="space-y-1.5">
                  {validLines.map((l) => {
                    const p = prodOf(l.id_produk);
                    const qty = Number(l.jumlah) || 0;
                    const harga = p?.harga_jual || 0;
                    return (
                      <li key={l.key} className="tnum flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[13px] ring-1 ring-slate-200">
                        <span className="min-w-0 flex-1 truncate font-bold">{p?.nama_produk}</span>
                        <span className="shrink-0 text-slate-500">{qty} pcs × {formatRupiah(harga)}</span>
                        <b className="shrink-0 text-emerald-700">{formatRupiah(qty * harga)}</b>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-2.5 flex justify-between border-t border-emerald-100 pt-2 text-[13px]">
                <span className="text-slate-500">Total titip</span>
                <b className="tnum">{totalPcs} pcs · {validLines.length} macam</b>
              </div>
              <div className="mt-1 flex justify-between text-[13px]">
                <span className="text-slate-500">Nilai barang</span>
                <b className="tnum text-emerald-700">{formatRupiah(totalNilai)}</b>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t border-slate-100 p-4">
            <button type="button" onClick={close} disabled={submitting} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
              <Check size={16} strokeWidth={3} /> {submitting ? "Menyimpan…" : "Simpan Nota Titip"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
