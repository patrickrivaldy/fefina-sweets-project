"use client";

import { useRef, useState } from "react";
import { formatRupiah } from "@/utils/format";
import { STATUS_PEMBAYARAN, STATUS_KONSINYASI } from "@/constants/app";
import Select from "@/components/ui/Select";
import { X, Plus, Trash2, Check } from "lucide-react";

export default function EditKonsinyasiModal({
  isOpen,
  consignment,
  onClose,
  onSubmit,
  submitting,
  resellers,
  products,
  fiturMigrasi = true,
}) {
  const [idMitra, setIdMitra] = useState(consignment?.id_mitra || "");
  const [tanggal, setTanggal] = useState(
    consignment?.tanggal_titip ? String(consignment.tanggal_titip).slice(0, 10) : ""
  );
  const [jatuhTempo, setJatuhTempo] = useState(
    consignment?.jatuh_tempo ? String(consignment.jatuh_tempo).slice(0, 10) : ""
  );
  const [status, setStatus] = useState(consignment?.status_pembayaran || "Belum Lunas");
  const [statusKns, setStatusKns] = useState(consignment?.status_konsinyasi || "Berjalan");
  const [lines, setLines] = useState(() =>
    (consignment?.detail_konsinyasi || []).map((d) => ({
      key: d.id_detail_kns,
      id_detail_kns: d.id_detail_kns,
      id_produk: d.id_produk,
      nama: d.produk?.nama_produk || "Produk",
      harga: d.produk?.harga_jual || 0,
      titipAwal: d.jumlah_titip || 0,
      titip: String(d.jumlah_titip ?? ""),
      laku: String(d.jumlah_laku ?? 0),
      returBagus: String(d.jumlah_retur_bagus ?? 0),
      returRusak: String(d.jumlah_retur_rusak ?? 0),
      removed: false,
    }))
  );
  const [err, setErr] = useState("");
  const keyRef = useRef(-1);

  if (!isOpen || !consignment) return null;

  const prodOf = (id) => products.find((p) => p.id_produk === id);
  const activeLines = lines.filter((l) => !l.removed);
  const usedIds = activeLines.map((l) => l.id_produk).filter(Boolean);

  const setLine = (key, patch) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { key: keyRef.current--, id_detail_kns: null, id_produk: "", nama: "", harga: 0, titipAwal: 0, titip: "", laku: "0", returBagus: "0", returRusak: "0", removed: false, isNew: true },
    ]);
    setErr("");
  };

  const keptTotal = activeLines.reduce(
    (s, l) => s + (Number(l.laku) || 0) * (l.harga || prodOf(l.id_produk)?.harga_jual || 0),
    0
  );

  const close = () => {
    if (!submitting) onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!idMitra) return setErr("Pilih toko.");
    if (!tanggal) return setErr("Isi tanggal titip.");
    if (!activeLines.length) return setErr("Nota harus punya minimal 1 produk. Hapus nota saja bila batal semua.");
    const out = [];
    for (let i = 0; i < activeLines.length; i++) {
      const l = activeLines[i];
      if (l.isNew && !l.id_produk) return setErr(`Baris baru ${i + 1}: pilih produknya.`);
      const harga = l.harga || prodOf(l.id_produk)?.harga_jual || 0;
      const titip = Number(l.titip) || 0;
      const laku = Number(l.laku) || 0;
      const returBagus = Math.max(0, Number(l.returBagus) || 0);
      const returRusak = Math.max(0, Number(l.returRusak) || 0);
      if (titip <= 0) return setErr(`Baris ${l.nama || i + 1}: jumlah titip harus > 0.`);
      if (laku < 0) return setErr(`Baris ${l.nama || i + 1}: laku tidak boleh minus.`);
      if (laku + returBagus + returRusak > titip) return setErr(`Baris ${l.nama || i + 1}: laku + retur (${laku + returBagus + returRusak}) melebihi titip (${titip}).`);
      if (l.isNew) {
        const p = prodOf(l.id_produk);
        if (titip > (p?.stok || 0)) return setErr(`${p?.nama_produk}: stok tinggal ${p?.stok}.`);
      } else {
        const tambah = titip - l.titipAwal;
        const p = prodOf(l.id_produk);
        if (tambah > (p?.stok || 0))
          return setErr(`${l.nama}: stok tinggal ${p?.stok}, butuh tambah ${tambah}.`);
      }
      out.push({
        id_detail_kns: l.id_detail_kns,
        id_produk: l.id_produk,
        harga,
        titipAwal: l.titipAwal,
        jumlah_titip: titip,
        jumlah_laku: laku,
        jumlah_retur_bagus: returBagus,
        jumlah_retur_rusak: returRusak,
      });
    }
    // duplikat produk di baris baru vs lama
    const ids = out.map((l) => l.id_produk);
    if (new Set(ids).size !== ids.length) return setErr("Ada produk yang dobel. Gabungkan jumlahnya.");
    try {
      await onSubmit({
        id_konsinyasi: consignment.id_konsinyasi,
        id_mitra: idMitra,
        tanggal_titip: tanggal,
        jatuh_tempo: jatuhTempo || null,
        status_pembayaran: status,
        status_konsinyasi: statusKns,
        lines: out,
        removedIds: lines.filter((l) => l.removed && l.id_detail_kns).map((l) => l.id_detail_kns),
        removedRestore: lines
          .filter((l) => l.removed && l.id_detail_kns)
          .map((l) => ({
            id_produk: l.id_produk,
            sisa: Math.max(0, l.titipAwal - (Number(l.laku) || 0) - (Number(l.returBagus) || 0) - (Number(l.returRusak) || 0)),
          })),
      });
    } catch (e2) {
      setErr(e2.message || "Gagal menyimpan perubahan.");
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
            <h2 className="text-base font-bold">Ubah Nota Titip</h2>
            <p className="font-mono text-[11px] text-slate-400">{consignment.id_konsinyasi}</p>
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
              <Select label="Toko *" value={idMitra} onChange={(e) => setIdMitra(e.target.value)} disabled={submitting}
                placeholder="Pilih toko…">
                {resellers.map((r) => (
                  <option key={r.id_mitra} value={r.id_mitra}>{r.nama_toko}</option>
                ))}
              </Select>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold">Tanggal *</label>
                <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} disabled={submitting} className={`${input} w-full`} />
              </div>
            </div>
            {fiturMigrasi && (
              <div>
                <label className="mb-1.5 block text-[13px] font-bold">Jatuh Tempo <span className="font-medium text-slate-400">(opsional)</span></label>
                <input type="date" value={jatuhTempo} onChange={(e) => setJatuhTempo(e.target.value)} disabled={submitting} className={`${input} w-full`} />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[13px] font-bold">Status Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_PEMBAYARAN.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    disabled={submitting}
                    className={`h-11 rounded-lg text-[13px] font-bold ${status === s ? (s === "Lunas" ? "bg-emerald-700 text-white" : "bg-amber-500 text-white") : "bg-slate-100 text-slate-500"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-bold">Status Nota</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_KONSINYASI.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusKns(s)}
                    disabled={submitting}
                    className={`h-11 rounded-lg text-[13px] font-bold ${statusKns === s ? (s === "Selesai" ? "bg-emerald-700 text-white" : "bg-blue-600 text-white") : "bg-slate-100 text-slate-500"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">Ubah ke Selesai untuk menarik sisa retur bagus kembali ke stok (otomatis oleh database).</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-bold">Produk ({activeLines.length} macam)</p>
                <button
                  type="button"
                  onClick={addLine}
                  disabled={submitting}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <Plus size={14} strokeWidth={2.5} /> Tambah Macam
                </button>
              </div>
              <div className="space-y-2.5">
                {lines.filter((l) => !l.removed).map((l) => {
                  const p = prodOf(l.id_produk);
                  const tambah = (Number(l.titip) || 0) - (l.titipAwal || 0);
                  const need = l.isNew ? Number(l.titip) || 0 : Math.max(0, tambah);
                  const over = need > (p?.stok || 0);
                  return (
                    <div key={l.key} className="rounded-xl bg-[#eff4ff]/60 p-3 ring-1 ring-slate-200">
                      {l.isNew ? (
                        <Select
                          value={l.id_produk}
                          onChange={(e) => {
                            const pr = prodOf(e.target.value);
                            setLine(l.key, { id_produk: e.target.value, nama: pr?.nama_produk || "", harga: pr?.harga_jual || 0 });
                          }}
                          disabled={submitting}
                          placeholder="Pilih produk…"
                        >
                          {products.map((pr) => (
                            <option key={pr.id_produk} value={pr.id_produk} disabled={usedIds.includes(pr.id_produk) && pr.id_produk !== l.id_produk}>
                              {pr.nama_produk} (stok {pr.stok})
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] font-bold">{l.nama}</p>
                          <button
                            type="button"
                            onClick={() => setLine(l.key, { removed: true })}
                            disabled={submitting}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Tarik baris ini (sisa kembali ke stok)"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="flex h-11 items-center gap-1.5 rounded-lg bg-white px-2.5 ring-1 ring-slate-200">
                          <span className="text-[11px] text-slate-400">Titip</span>
                          <input
                            type="number" min="1" value={l.titip}
                            onChange={(e) => setLine(l.key, { titip: e.target.value })}
                            disabled={submitting}
                            className="tnum w-full bg-transparent text-right text-sm font-bold outline-none"
                          />
                        </label>
                        <label className="flex h-11 items-center gap-1.5 rounded-lg bg-white px-2.5 ring-1 ring-slate-200">
                          <span className="text-[11px] text-slate-400">Laku</span>
                          <input
                            type="number" min="0" value={l.laku}
                            onChange={(e) => setLine(l.key, { laku: e.target.value })}
                            disabled={submitting}
                            className="tnum w-full bg-transparent text-right text-sm font-bold outline-none"
                          />
                        </label>
                        <label className="flex h-11 items-center gap-1.5 rounded-lg bg-white px-2.5 ring-1 ring-blue-200">
                          <span className="text-[11px] text-blue-600">Retur bgus</span>
                          <input
                            type="number" min="0" value={l.returBagus}
                            onChange={(e) => setLine(l.key, { returBagus: e.target.value })}
                            disabled={submitting}
                            className="tnum w-full bg-transparent text-right text-sm font-bold outline-none"
                          />
                        </label>
                        <label className="flex h-11 items-center gap-1.5 rounded-lg bg-white px-2.5 ring-1 ring-red-200">
                          <span className="text-[11px] text-red-500">Retur rsk</span>
                          <input
                            type="number" min="0" value={l.returRusak}
                            onChange={(e) => setLine(l.key, { returRusak: e.target.value })}
                            disabled={submitting}
                            className="tnum w-full bg-transparent text-right text-sm font-bold outline-none"
                          />
                        </label>
                      </div>
                      <p className={`mt-1.5 text-[11px] ${over ? "font-bold text-red-600" : "text-slate-500"}`}>
                        {l.isNew
                          ? `Stok tersedia: ${p?.stok ?? "-"}`
                          : tambah > 0
                            ? `Butuh stok +${tambah} (tersedia ${p?.stok ?? 0})`
                            : tambah < 0
                              ? `Stok kembali +${-tambah}`
                              : `Stok tersedia: ${p?.stok ?? 0}`}
                        {over && " — melebihi stok!"}
                      </p>
                    </div>
                  );
                })}
                {lines.some((l) => l.removed) && (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
                    {lines.filter((l) => l.removed).length} baris ditarik — sisanya kembali ke stok saat disimpan.
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {lines.filter((l) => l.removed).map((l) => (
                        <button key={l.key} type="button" onClick={() => setLine(l.key, { removed: false })} className="rounded-md bg-white px-2 py-1 font-bold ring-1 ring-amber-200">
                          Batalkan: {l.nama}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50/70 p-3.5 ring-1 ring-emerald-100">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Rincian per varian</p>
              <ul className="space-y-1.5">
                {activeLines.map((l) => {
                  const harga = l.harga || prodOf(l.id_produk)?.harga_jual || 0;
                  const laku = Number(l.laku) || 0;
                  return (
                    <li key={l.key} className="tnum flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[13px] ring-1 ring-slate-200">
                      <span className="min-w-0 flex-1 truncate font-bold">{l.nama || prodOf(l.id_produk)?.nama_produk || "Produk"}</span>
                      <span className="shrink-0 text-slate-500">{laku} laku × {formatRupiah(harga)}</span>
                      <b className="shrink-0 text-emerald-700">{formatRupiah(laku * harga)}</b>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2.5 flex justify-between border-t border-emerald-100 pt-2 text-[13px]">
                <span className="text-slate-500">Total tagihan baru</span>
                <b className="tnum text-emerald-700">{formatRupiah(keptTotal)}</b>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t border-slate-100 p-4">
            <button type="button" onClick={close} disabled={submitting} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
              <Check size={16} strokeWidth={3} /> {submitting ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
