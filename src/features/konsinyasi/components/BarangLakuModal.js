"use client";

import { useState } from "react";
import { formatRupiah } from "@/utils/format";
import { X, Check } from "lucide-react";

// Catat laku + retur SEKALIGUS untuk semua produk dalam 1 nota.
// Per baris: tambah laku, retur bagus, retur rusak — dengan validasi
// laku + retur_bagus + retur_rusak <= jumlah_titip (sama seperti cek database).
export default function BarangLakuModal({
  isOpen,
  consignment,
  onClose,
  onSubmit,
  submitting,
}) {
  const details = consignment?.detail_konsinyasi || [];
  const [rows, setRows] = useState(() =>
    details.map((d) => ({ id_detail_kns: d.id_detail_kns, tambahLaku: "", tambahBagus: "", tambahRusak: "" }))
  );
  const [err, setErr] = useState("");

  if (!isOpen || !consignment) return null;
  if (details.length === 0) return null;

  const rowOf = (id) => rows.find((r) => r.id_detail_kns === id) || {};
  const setRow = (id, patch) =>
    setRows((prev) => prev.map((r) => (r.id_detail_kns === id ? { ...r, ...patch } : r)));

  const info = details.map((d) => {
    const r = rowOf(d.id_detail_kns);
    const titip = d.jumlah_titip || 0;
    const lakuLama = d.jumlah_laku || 0;
    const bagusLama = d.jumlah_retur_bagus || 0;
    const rusakLama = d.jumlah_retur_rusak || 0;
    const harga = d.produk?.harga_jual || 0;
    const tLaku = Math.max(0, Number(r.tambahLaku) || 0);
    const tBagus = Math.max(0, Number(r.tambahBagus) || 0);
    const tRusak = Math.max(0, Number(r.tambahRusak) || 0);
    const pakai = tLaku + tBagus + tRusak;
    const sisa = titip - lakuLama - bagusLama - rusakLama;
    return {
      d, titip, lakuLama, bagusLama, rusakLama, harga,
      tLaku, tBagus, tRusak, pakai, sisa,
      over: pakai > sisa,
      berubah: pakai > 0,
      piutang: tLaku * harga,
    };
  });

  const adaBerubah = info.some((x) => x.berubah);
  const adaOver = info.some((x) => x.over);
  const totalPiutang = info.reduce((s, x) => s + x.piutang, 0);
  const totalTagihanBaru = (consignment.total_tagihan || 0) + totalPiutang;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!adaBerubah) return setErr("Belum ada yang diisi.");
    const bad = info.find((x) => x.over);
    if (bad) return setErr(`${bad.d.produk?.nama_produk}: laku+retur (${bad.pakai}) melebihi sisa ${bad.sisa}.`);
    try {
      await onSubmit({
        consignment,
        changes: info.filter((x) => x.berubah).map((x) => ({
          id_detail_kns: x.d.id_detail_kns,
          lakuBaru: x.lakuLama + x.tLaku,
          returBagusBaru: x.bagusLama + x.tBagus,
          returRusakBaru: x.rusakLama + x.tRusak,
          subtotalBaru: (x.lakuLama + x.tLaku) * x.harga,
        })),
      });
      setRows(details.map((d) => ({ id_detail_kns: d.id_detail_kns, tambahLaku: "", tambahBagus: "", tambahRusak: "" })));
      setErr("");
    } catch (e2) {
      setErr(e2.message || "Gagal menyimpan.");
    }
  };

  const num = "tnum h-11 w-full rounded-lg border border-slate-300 px-2 text-right text-sm font-bold outline-none focus:border-emerald-700";

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-950/45" onClick={() => !submitting && onClose()} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:inset-0 sm:m-auto sm:h-fit sm:rounded-3xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">Catat Laku & Retur</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {consignment.mitra_toko?.nama_toko} • {consignment.id_konsinyasi}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Tutup" className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <X size={16} />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">Isi sekaligus untuk beberapa produk. Retur bagus kembali ke stok saat nota diselesaikan; retur rusak dicatat sebagai rugi.</p>

        <form onSubmit={submit} className="mt-3 space-y-3">
          {info.map((x) => (
            <div key={x.d.id_detail_kns} className={`rounded-xl p-3 ring-1 ${x.over ? "bg-red-50/60 ring-red-200" : "bg-[#eff4ff]/60 ring-slate-200"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-[13px] font-bold">{x.d.produk?.nama_produk}</p>
                <p className="tnum shrink-0 text-[11px] text-slate-500">laku {x.lakuLama}/{x.titip} • sisa {x.sisa}</p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-emerald-700">+ Laku</span>
                  <input type="number" min="0" max={x.sisa} value={rowOf(x.d.id_detail_kns).tambahLaku} onChange={(e) => setRow(x.d.id_detail_kns, { tambahLaku: e.target.value })} disabled={submitting || x.sisa <= 0} placeholder="0" className={num} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-blue-700">+ Retur bagus</span>
                  <input type="number" min="0" max={x.sisa} value={rowOf(x.d.id_detail_kns).tambahBagus} onChange={(e) => setRow(x.d.id_detail_kns, { tambahBagus: e.target.value })} disabled={submitting || x.sisa <= 0} placeholder="0" className={num} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold text-red-600">+ Retur rusak</span>
                  <input type="number" min="0" max={x.sisa} value={rowOf(x.d.id_detail_kns).tambahRusak} onChange={(e) => setRow(x.d.id_detail_kns, { tambahRusak: e.target.value })} disabled={submitting || x.sisa <= 0} placeholder="0" className={num} />
                </label>
              </div>
              {x.over && <p className="mt-1.5 text-[11px] font-bold text-red-600">Melebihi sisa {x.sisa}! Kurangi salah satunya.</p>}
              {x.berubah && !x.over && (
                <p className="tnum mt-1.5 text-[11px] text-slate-500">Piutang +{formatRupiah(x.piutang)}{x.tBagus > 0 || x.tRusak > 0 ? ` • retur ${x.tBagus + x.tRusak}` : ""}</p>
              )}
            </div>
          ))}

          <div className="rounded-xl bg-emerald-50/70 p-3.5 ring-1 ring-emerald-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tagihan nota jadi</span>
              <b className="tnum text-emerald-700">{formatRupiah(totalTagihanBaru)}</b>
            </div>
            <p className="tnum mt-1 text-[11px] text-slate-500">Sekarang {formatRupiah(consignment.total_tagihan)} + piutang baru {formatRupiah(totalPiutang)}</p>
          </div>

          {err && <p className="rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{err}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={submitting} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={submitting || !adaBerubah || adaOver} className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400">
              <Check size={16} strokeWidth={3} /> {submitting ? "Menyimpan…" : "Simpan Laku & Retur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
