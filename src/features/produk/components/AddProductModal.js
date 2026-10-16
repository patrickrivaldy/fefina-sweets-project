"use client";

import { useRef, useState } from "react";
import { supabase } from "@/config/supabase";
import { formatRupiah, randomId } from "@/utils/format";
import { compressImage } from "@/utils/image";
import RupiahInput from "@/components/ui/RupiahInput";
import { X, ImagePlus, Trash2, Check } from "lucide-react";

export default function AddProductModal({ isOpen, onClose, onSubmit, submitting, onToast, adaSku = true }) {
  const [form, setForm] = useState({
    nama_produk: "",
    sku: "",
    harga_jual: "",
    stok: "",
    deskripsi: "",
    is_deleted: false,
  });
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef(null);

  if (!isOpen) return null;

  const jual = Number(form.harga_jual) || 0;

  const change = (e) => {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
    setFormError("");
  };

  const pickImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setFormError("File harus berupa gambar.");
      return;
    }
    setCompressing(true);
    setFormError("");
    try {
      // Kecilkan dulu biar upload cepat & kasir tidak lemot
      const small = await compressImage(f);
      if (preview) URL.revokeObjectURL(preview);
      setImageFile(small);
      setPreview(URL.createObjectURL(small));
    } catch (err) {
      setFormError(err.message || "Gagal memproses gambar.");
    } finally {
      setCompressing(false);
    }
  };

  const reset = () => {
    setForm({ nama_produk: "", sku: "", harga_jual: "", stok: "", deskripsi: "", is_deleted: false });
    setImageFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setFormError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.nama_produk.trim()) return setFormError("Nama produk wajib diisi.");
    if (form.harga_jual === "") return setFormError("Harga jual wajib diisi.");
    if (form.stok === "") return setFormError("Stok awal wajib diisi.");
    if (Number(form.harga_jual) < 0 || Number(form.stok) < 0)
      return setFormError("Angka tidak boleh minus.");
    try {
      let photoUrl = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `products/${randomId()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("foto-produk")
          .upload(path, imageFile, { cacheControl: "3600", upsert: false, contentType: imageFile.type });
        if (upErr) {
          const raw = upErr.message || "Foto gagal diupload.";
          throw new Error(
            /bucket not found/i.test(raw)
              ? "Bucket foto 'foto-produk' belum dibuat di Supabase (Storage). Produk tanpa foto tetap bisa disimpan — lewati foto dulu, atau buat bucketnya lalu coba lagi."
              : raw
          );
        }
        photoUrl = supabase.storage.from("foto-produk").getPublicUrl(path).data.publicUrl;
      }
      await onSubmit({
        nama_produk: form.nama_produk.trim(),
        sku: form.sku.trim() || null,
        harga_jual: Number(form.harga_jual),
        stok: Number(form.stok),
        deskripsi: form.deskripsi.trim() || null,
        foto: photoUrl,
        is_deleted: form.is_deleted,
      });
      reset();
      onClose();
    } catch (err) {
      const msg = err.message || "Produk gagal disimpan.";
      setFormError(msg);
      onToast?.("error", msg);
    }
  };

  const input =
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15 disabled:bg-slate-100";
  const label = "mb-1.5 block text-[13px] font-bold text-slate-700";

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-950/45" onClick={() => !submitting && onClose()} />
      <aside className="nice-scroll absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold">Tambah Produk Baru</h2>
            <p className="text-xs text-slate-500">Isi data lengkap stok dan kalkulasi harga modal.</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Tutup" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="nice-scroll flex-1 space-y-4 overflow-y-auto p-5">
            {formError && (
              <p className="rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{formError}</p>
            )}

            <div>
              <p className={label}>Foto Produk</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={submitting || compressing}
                className="flex w-full items-center gap-3 rounded-xl bg-[#eff4ff] p-3.5 text-left hover:bg-slate-200"
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200">
                    <ImagePlus size={22} />
                  </span>
                )}
                <span>
                  <span className="block text-[13px] font-bold text-slate-700">
                    {preview ? "Ganti foto" : "Pilih atau Seret Foto Produk"}
                  </span>
                  <span className="block text-[11px] text-slate-500">JPG/PNG max 2MB (rasio 1:1 disarankan)</span>
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />
              {compressing && (
                <p className="mt-2 text-xs font-bold text-emerald-700">Mengecilkan foto…</p>
              )}
              {preview && (
                <button type="button" onClick={() => { setImageFile(null); URL.revokeObjectURL(preview); setPreview(""); if (fileRef.current) fileRef.current.value = ""; }} className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                  <Trash2 size={13} /> Hapus foto
                </button>
              )}
            </div>

            <div>
              <label className={label} htmlFor="ap-nama">Nama Produk *</label>
              <input id="ap-nama" name="nama_produk" value={form.nama_produk} onChange={change} disabled={submitting} placeholder="Misal: Manisan Mangga 250g" className={input} />
            </div>

            {adaSku && (
              <div>
                <label className={label} htmlFor="ap-sku">SKU / Barcode <span className="font-medium text-slate-400">(opsional, untuk scan kasir)</span></label>
                <input id="ap-sku" name="sku" value={form.sku} onChange={change} disabled={submitting} placeholder="Misal: FSN-MNG-250" className={`${input} font-mono`} />
              </div>
            )}

            <div>
              <label className={label} htmlFor="ap-harga">Harga Jual (Rp) *</label>
              <RupiahInput value={form.harga_jual} onChange={(v) => change({ target: { name: "harga_jual", value: v } })} disabled={submitting} placeholder="25.000" className={`${input} tnum text-right font-bold`} />
            </div>

            <div className="rounded-xl bg-[#eff4ff] p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-800">
                Modal (HPP) Otomatis
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                HPP dihitung sendiri dari resep produk × harga rata-rata bahan baku. Atur bahannya di modul Bahan Baku &amp; Produksi — margin muncul otomatis di daftar produk.
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
                Stok awal dikunci sebagai batch dengan HPP saat ini (Rp 0 kalau resep belum dibuat). Paling akurat: isi stok 0 di sini, lalu Catat Produksi setelah resep jadi.
              </p>
              {jual > 0 && (
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-[13px] ring-1 ring-slate-200">
                  <span className="text-slate-500">Harga jual</span>
                  <b className="tnum text-emerald-700">{formatRupiah(jual)}</b>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={label} htmlFor="ap-stok">Stok Awal *</label>
                <input id="ap-stok" name="stok" type="number" min="0" value={form.stok} onChange={change} disabled={submitting} placeholder="50" className={`${input} tnum text-right font-bold`} />
              </div>
              <div>
                <span className={label}>Tampil di Kasir</span>
                <button
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, is_deleted: !c.is_deleted }))}
                  className={`flex h-11 w-full items-center justify-between rounded-lg px-3.5 text-[13px] font-bold ${form.is_deleted ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}
                >
                  {form.is_deleted ? "Disembunyikan" : "Aktif"}
                  <span className={`relative h-6 w-11 rounded-full transition ${form.is_deleted ? "bg-slate-300" : "bg-emerald-600"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.is_deleted ? "left-0.5" : "left-[22px]"}`} />
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className={label} htmlFor="ap-desk">Deskripsi Singkat</label>
              <textarea id="ap-desk" name="deskripsi" value={form.deskripsi} onChange={change} rows={3} disabled={submitting} placeholder="Komposisi, berat bersih, varian rasa..." className="w-full resize-none rounded-lg border border-slate-300 px-3.5 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" />
            </div>
          </div>

          <div className="flex gap-2 border-t border-slate-100 p-4">
            <button type="button" onClick={onClose} disabled={submitting} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={submitting || compressing} className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
              <Check size={16} strokeWidth={3} /> {submitting ? "Menyimpan…" : "Simpan Produk"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
