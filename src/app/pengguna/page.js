"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/config/supabase";
import { Users, Plus, Pencil, Trash2, Link2 } from "lucide-react";

const ROLES = ["Admin", "Kasir", "Owner"];

export default function PenggunaPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nama_lengkap: "", username: "", email: "", role_akses: "Kasir", auth_id: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase.from("pengguna").select("*").eq("is_deleted", false).order("nama_lengkap");
    if (error) { setError("Gagal memuat pengguna."); setRows([]); }
    else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? rows.filter((x) => x.nama_lengkap?.toLowerCase().includes(k) || x.username?.toLowerCase().includes(k)) : rows;
  }, [rows, q]);

  // is_disetujui undefined (instalasi lama) = dianggap aktif agar tidak terkunci.
  const pending = filtered.filter((x) => x.is_disetujui === false);
  const aktif = filtered.filter((x) => x.is_disetujui !== false);
  const [accRole, setAccRole] = useState({});

  const setujui = async (row) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("pengguna")
        .update({ is_disetujui: true, role_akses: accRole[row.id_pengguna] || "Kasir" })
        .eq("id_pengguna", row.id_pengguna);
      if (error) throw new Error(error.message);
      await load();
    } catch (e2) {
      alert(e2.message || "Gagal menyetujui.");
    } finally {
      setBusy(false);
    }
  };

  const tolak = async (row) => {
    if (!window.confirm(`Tolak pendaftaran "${row.nama_lengkap}"?`)) return;
    await supabase.from("pengguna").update({ is_deleted: true }).eq("id_pengguna", row.id_pengguna);
    await load();
  };

  const openAdd = () => { setEditing(null); setForm({ nama_lengkap: "", username: "", email: "", role_akses: "Kasir", auth_id: "" }); setErr(""); setShowForm(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ nama_lengkap: row.nama_lengkap, username: row.username, email: row.email || "", role_akses: row.role_akses || "Kasir", auth_id: row.auth_id || "" });
    setErr(""); setShowForm(true);
  };

  const simpan = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.nama_lengkap.trim()) return setErr("Nama lengkap wajib diisi.");
    if (!form.username.trim()) return setErr("Username wajib diisi.");
    if (form.auth_id && !/^[0-9a-f-]{36}$/i.test(form.auth_id.trim())) return setErr("Auth ID harus UUID user Auth (atau kosongkan).");
    setBusy(true);
    try {
      if (editing) {
        const patch = { nama_lengkap: form.nama_lengkap.trim(), username: form.username.trim(), email: form.email.trim() || null, role_akses: form.role_akses, auth_id: form.auth_id.trim() || null };
        const { error } = await supabase.from("pengguna").update(patch).eq("id_pengguna", editing.id_pengguna);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("pengguna").insert([{
          nama_lengkap: form.nama_lengkap.trim(),
          username: form.username.trim(),
          email: form.email.trim() || null,
          role_akses: form.role_akses,
          auth_id: form.auth_id.trim() || null,
          is_disetujui: true, // dibuat admin langsung = disetujui
          is_deleted: false,
        }]);
        if (error) throw new Error(error.message.includes("duplicate") ? "Username sudah dipakai." : error.message);
      }
      setShowForm(false);
      await load();
    } catch (e2) { setErr(e2.message || "Gagal menyimpan."); }
    finally { setBusy(false); }
  };

  const hapus = async (row) => {
    if (!window.confirm(`Nonaktifkan "${row.nama_lengkap}"?`)) return;
    await supabase.from("pengguna").update({ is_deleted: true }).eq("id_pengguna", row.id_pengguna);
    await load();
  };

  return (
    <DashboardLayout>
      <div className="flex w-full flex-col gap-4">
        <PageHeader
          eyebrow="Akses & Staf"
          title="Pengguna"
          subtitle={`${aktif.length} staf aktif • ${pending.length} menunggu persetujuan.`}
          action={
            <button type="button" onClick={openAdd} className="flex h-12 items-center gap-1.5 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">
              <Plus size={16} /> Tambah
            </button>
          }
        />

        <div className="rounded-xl bg-[#eff4ff] p-3.5 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200/60">
          <b>Cara pakai:</b> staf daftar sendiri di halaman <b>Daftar</b> (link di halaman Masuk) → pendaftar muncul di bawah sebagai <b>Menunggu persetujuan</b> → pilih peran + <b>Setujui</b>.
          Cara lama tetap bisa: buat akun di Authentication, tempel UID ke Auth ID + pilih peran.
        </div>

        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/60">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / username…" className="h-11 w-full rounded-lg bg-[#eff4ff] px-4 text-sm font-medium outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600/25 sm:max-w-sm" />
        </div>

        {!loading && !error && pending.length > 0 && (
          <section className="rounded-xl bg-amber-50/60 p-4 shadow-sm ring-1 ring-amber-200">
            <h2 className="text-[15px] font-bold">Menunggu persetujuan ({pending.length})</h2>
            <p className="mt-0.5 text-xs text-slate-500">Pilih peran lalu Setujui. Ditolak = dinonaktifkan.</p>
            <div className="mt-3 grid items-start gap-3 sm:grid-cols-2">
              {pending.map((x) => (
                <article key={x.id_pengguna} className="rounded-xl bg-white p-4 ring-1 ring-amber-200">
                  <p className="truncate text-sm font-bold">{x.nama_lengkap}</p>
                  <p className="truncate font-mono text-xs text-slate-500">@{x.username}{x.email ? ` • ${x.email}` : ""}</p>
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                    {ROLES.map((r) => (
                      <button key={r} type="button" onClick={() => setAccRole((p) => ({ ...p, [x.id_pengguna]: r }))} disabled={busy} className={`h-9 rounded-lg text-xs font-bold ${(accRole[x.id_pengguna] || "Kasir") === r ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>{r}</button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy} onClick={() => setujui(x)} className="h-10 flex-1 rounded-lg bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">Setujui sebagai {(accRole[x.id_pengguna] || "Kasir")}</button>
                    <button type="button" disabled={busy} onClick={() => tolak(x)} className="h-10 rounded-lg bg-white px-4 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">Tolak</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {loading ? <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Memuat…</div>
        : error ? <EmptyState icon={<Users size={24} />} title="Gagal" message={error} />
        : aktif.length === 0 ? <EmptyState icon={<Users size={24} />} title="Kosong" message="Belum ada pengguna aktif." />
        : (
          <div className="grid items-start gap-3 sm:grid-cols-2">
            {aktif.map((x) => (
              <article key={x.id_pengguna} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-sm font-extrabold text-white">
                    {x.nama_lengkap?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-bold">{x.nama_lengkap}</p>
                    <p className="truncate font-mono text-xs text-slate-500">@{x.username}</p>
                    {x.email && <p className="truncate text-[11px] text-slate-400">{x.email}</p>}
                    <p className={`mt-1 flex items-center gap-1 text-[11px] ${x.auth_id ? "text-emerald-700" : "text-amber-600"}`}>
                      <Link2 size={11} /> {x.auth_id ? "Tertaut ke Auth" : "Belum tertaut"}
                    </p>
                  </div>
                  <Badge tone={x.role_akses === "Admin" ? "green" : x.role_akses === "Owner" ? "yellow" : "blue"} dot={false}>{x.role_akses || "Kasir"}</Badge>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(x)} aria-label="Ubah" className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15} /></button>
                    <button type="button" onClick={() => hapus(x)} aria-label="Hapus" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
          <form onSubmit={simpan} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-base font-bold">{editing ? "Ubah Pengguna" : "Tambah Pengguna"}</h2>
            {err && <p className="mt-3 rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-600">{err}</p>}
            <div className="mt-3 space-y-3">
              <div><label className="mb-1.5 block text-[13px] font-bold">Nama Lengkap *</label>
                <input value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} disabled={busy} placeholder="Nama staf" className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" /></div>
              <div><label className="mb-1.5 block text-[13px] font-bold">Username *</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={busy} placeholder="kasir01" className="h-11 w-full rounded-lg border border-slate-300 px-3.5 font-mono text-sm outline-none focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" /></div>
              <div><label className="mb-1.5 block text-[13px] font-bold">Email <span className="font-medium text-slate-400">(opsional)</span></label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={busy} placeholder="staf@fefina.com" className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" /></div>
              <p className="rounded-lg bg-[#eff4ff] p-3 text-[11px] leading-relaxed text-slate-500">Password login diatur di Supabase Authentication, bukan di sini. Staf yang lupa password pakai &quot;Lupa password?&quot; di halaman Masuk.</p>
              <div><label className="mb-1.5 block text-[13px] font-bold">Peran</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => (
                    <button key={r} type="button" onClick={() => setForm({ ...form, role_akses: r })} disabled={busy} className={`h-11 rounded-lg text-[13px] font-bold ${form.role_akses === r ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>{r}</button>
                  ))}
                </div></div>
              <div><label className="mb-1.5 block text-[13px] font-bold">Auth ID <span className="font-medium text-slate-400">(UUID dari Authentication)</span></label>
                <input value={form.auth_id} onChange={(e) => setForm({ ...form, auth_id: e.target.value })} disabled={busy} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="h-11 w-full rounded-lg border border-slate-300 px-3.5 font-mono text-xs outline-none focus:border-emerald-700 focus:ring-[3px] focus:ring-emerald-600/15" /></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} disabled={busy} className="h-12 flex-1 rounded-lg bg-slate-100 text-sm font-bold text-slate-600">Batal</button>
              <button type="submit" disabled={busy} className="h-12 flex-[2] rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">{busy ? "Menyimpan…" : "Simpan"}</button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
