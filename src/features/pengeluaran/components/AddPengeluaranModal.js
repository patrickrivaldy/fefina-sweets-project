"use client";

import { useState } from "react";
import { formatRupiah, todayWIB } from "@/utils/format";
import { KATEGORI_PENGELUARAN } from "@/constants/app";
import RupiahInput from "@/components/ui/RupiahInput";
import { X, Check } from "lucide-react";

// Form catat pengeluaran (tampilan saja — simpan beneran lewat onSubmit di page).
export default function AddPengeluaranModal({ isOpen, onClose, onSubmit, submitting, adaKategori = true }) {
  const [form, setForm] = useState({ keterangan: "", nominal: "", tanggal: todayWIB(), kategori: "Operasional" });
  const [formError, setFormError] = useState("");

  if (!isOpen) return null;

  const tutup = () => {
    setFormError("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.keterangan.trim()) return setFormError("Tulis keperluannya dulu.");
    if (!Number(form.nominal) || Number(form.nominal) <= 0) return setFormError("Nominal harus lebih dari 0.");
    try {
      await onSubmit({
        keterangan: form.keterangan.trim(),
        nominal: Number(form.nominal),
        tanggal: form.tanggal,
        kategori: form.kategori,
      });
      setForm({ keterangan: "", nominal: "", tanggal: todayWIB(), kategori: "Operasional" });
    } catch (e2) {
      setFormError(e2.message || "Gagal menyimpan.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-950/45" onClick={() => !submitting && tutup()} />
      <aside className="nice-scroll absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold">Catat Pengeluaran</h2>
            <p className="text-xs text-slate-500">Untuk apa: mencatat tiap uang keluar selain kulakan bahan.</p>
          </div>
          <button type="button" onClick={tutup} disabled={submitting} aria-label="Tutup" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="nice-scroll flex-1 space-y-4 overflow-y-auto p-5">
            {formError && <p className="rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{formError}</p>}
            <div>
              <label className="mb-1.5 block text-[13px] font-bold">Keterangan *</label>
              <input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} disabled={submitting} placeholder="Contoh: token listrik, paper bag, gaji" className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" />
            </div>
            {adaKategori && (
              <div>
                <label className="mb-1.5 block text-[13px] font-bold">Kategori</label>
                <div className="flex flex-wrap gap-1.5">
                  {KATEGORI_PENGELUARAN.map((k) => (
                    <button key={k} type="button" onClick={() => setForm({ ...form, kategori: k })} disabled={submitting}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${form.kategori === k ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold">Nominal (Rp) *</label>
                <RupiahInput value={form.nominal} onChange={(v) => setForm({ ...form, nominal: v })} disabled={submitting} placeholder="50.000" className="tnum h-11 w-full rounded-lg border border-slate-300 px-3.5 text-right text-sm font-bold outline-none placeholder:text-slate-400 focus:border-emerald-700" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold">Tanggal</label>
                <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} disabled={submitting} className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700" />
              </div>
            </div>
            {Number(form.nominal) > 0 && (
              <p className="rounded-lg bg-red-50/60 p-3 text-sm ring-1 ring-red-100">
                Keluar: <b className="tnum text-red-600">- {formatRupiah(form.nominal)}</b>
              </p>
            )}
          </div>
          <div className="flex gap-2 border-t border-slate-100 p-4">
            <button type="button" onClick={tutup} disabled={submitting} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
              <Check size={16} strokeWidth={3} /> {submitting ? "Menyimpan…" : "Simpan Pengeluaran"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
