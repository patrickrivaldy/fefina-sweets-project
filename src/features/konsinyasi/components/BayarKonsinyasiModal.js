"use client";

import { useState } from "react";
import { formatRupiah, todayWIB } from "@/utils/format";
import RupiahInput from "@/components/ui/RupiahInput";
import { X, Check } from "lucide-react";

// Catat cicilan pembayaran nota. Status Lunas otomatis oleh trigger DB
// (proses_bayar_konsinyasi) bila total cicilan >= tagihan.
export default function BayarKonsinyasiModal({
  isOpen,
  consignment,
  sisa,
  onClose,
  onSubmit,
  submitting,
}) {
  const [nominal, setNominal] = useState("");
  const [tanggal, setTanggal] = useState(todayWIB());
  const [err, setErr] = useState("");

  if (!isOpen || !consignment) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const n = Number(nominal);
    if (!n || n <= 0) return setErr("Nominal harus lebih dari 0.");
    if (n > sisa) return setErr(`Melebihi sisa tagihan (${formatRupiah(sisa)}).`);
    try {
      await onSubmit({ id_konsinyasi: consignment.id_konsinyasi, nominal: n, tanggal });
      setNominal("");
      setTanggal(todayWIB());
      setErr("");
    } catch (e2) {
      setErr(e2.message || "Gagal menyimpan pembayaran.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">Catat Pembayaran</h2>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">{consignment.id_konsinyasi}</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Tutup" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <p className="mt-2 rounded-lg bg-[#eff4ff] p-3 text-sm">Sisa tagihan: <b className="tnum text-emerald-700">{formatRupiah(sisa)}</b></p>
        {err && <p className="mt-3 rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{err}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold">Nominal (Rp) *</label>
            <RupiahInput value={nominal} onChange={setNominal} disabled={submitting} placeholder="100.000" autoFocus
              className="tnum h-11 w-full rounded-lg border border-slate-300 px-3.5 text-right text-sm font-bold outline-none placeholder:text-slate-400 focus:border-emerald-700" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold">Tanggal</label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} disabled={submitting}
              className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">Batal</button>
          <button type="submit" disabled={submitting} className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
            <Check size={16} strokeWidth={3} /> {submitting ? "Menyimpan…" : "Simpan Pembayaran"}
          </button>
        </div>
      </form>
    </div>
  );
}
