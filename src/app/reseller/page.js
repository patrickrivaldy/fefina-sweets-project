"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import AddResellerModal from "@/features/reseller/components/AddResellerModal";
import EditResellerModal from "@/features/reseller/components/EditResellerModal";
import { supabase } from "@/config/supabase";
import { Users, Plus, Pencil, Trash2, Phone, MapPin } from "lucide-react";

export default function ResellerPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("mitra_toko")
      .select("*")
      .eq("is_deleted", false)
      .order("tanggal_daftar", { ascending: false });
    if (error) {
      setError("Gagal memuat reseller.");
      setRows([]);
    } else setRows(data || []);
    setLoading(false);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch awal saat halaman dibuka
    load();
  }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? rows.filter((r) => r.nama_toko?.toLowerCase().includes(k) || r.nama_pemilik?.toLowerCase().includes(k)) : rows;
  }, [rows, q]);

  const add = async (d) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("mitra_toko").insert([d]);
      if (error) throw new Error(error.message);
      await load();
      setShowAdd(false);
    } finally {
      setBusy(false);
    }
  };

  const edit = async (d) => {
    setBusy(true);
    try {
      const { id_mitra, ...rest } = d;
      const { error } = await supabase.from("mitra_toko").update(rest).eq("id_mitra", id_mitra);
      if (error) throw new Error(error.message);
      await load();
      setShowEdit(false);
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Nonaktifkan "${r.nama_toko}"?`)) return;
    setBusy(true);
    try {
      await supabase.from("mitra_toko").update({ is_deleted: true }).eq("id_mitra", r.id_mitra);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <PageHeader
          eyebrow="Jaringan Titip Jual"
          title="Reseller"
          subtitle={`${rows.length} toko aktif — tempat nitip barang.`}
          action={
            <button type="button" onClick={() => setShowAdd(true)} className="flex h-12 items-center gap-1.5 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">
              <Plus size={16} /> Tambah
            </button>
          }
        />

        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/60">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama toko / pemilik…" className="h-11 w-full rounded-lg bg-[#eff4ff] px-4 text-sm font-medium outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600/25 sm:max-w-sm" />
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Memuat…</div>
        ) : error ? (
          <EmptyState icon={<Users size={24} />} title="Gagal" message={error} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={24} />} title="Kosong" message={q ? "Tidak ada yang cocok." : "Belum ada reseller. Tambah toko pertama."} />
        ) : (
          <div className="grid items-start gap-3 sm:grid-cols-2">
            {filtered.map((r) => (
              <article key={r.id_mitra} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-sm font-extrabold text-white">
                    {r.nama_toko?.charAt(0)?.toUpperCase() || "T"}
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-bold">{r.nama_toko}</p>
                    <p className="truncate text-xs text-slate-500">Pemilik: {r.nama_pemilik || "-"}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" disabled={busy} onClick={() => { setSelected(r); setShowEdit(true); }} aria-label="Ubah" className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-800">
                      <Pencil size={15} />
                    </button>
                    <button type="button" disabled={busy} onClick={() => remove(r)} aria-label="Hapus" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                  {r.no_whatsapp && (
                    <p className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {r.no_whatsapp}</p>
                  )}
                  {r.alamat && (
                    <p className="flex items-start gap-1.5"><MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" /> <span className="line-clamp-2">{r.alamat}</span></p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <AddResellerModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSubmit={add} submitting={busy} />
      <EditResellerModal key={selected?.id_mitra || "edit"} isOpen={showEdit} reseller={selected} onClose={() => { setShowEdit(false); setSelected(null); }} onSubmit={edit} submitting={busy} />
    </DashboardLayout>
  );
}
